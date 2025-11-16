import { arrayBufferToBase64, request } from 'obsidian';
import { isArray, isArrayBuffer, isBoolean, isDate, isNumber, isObject, isSafeInteger } from 'lodash-es';
import { format, parse } from 'date-fns';
import { SafeAny } from './utils';
import { XmlRpcOptions } from './types';
import { Logger } from './logger';

export class XmlRpcClient {

  /**
   * Href without '/' at the very end.
   * @private
   */
  private readonly href: string;

  /**
   * XML-RPC path without '/' at the beginning or end.
   * @private
   */
  private readonly xmlRpcPath: string;

  private readonly endpoint: string;

  constructor(
    private readonly options: XmlRpcOptions
  ) {
    Logger.log(options);

    this.href = this.options.url.href;
    if (this.href.endsWith('/')) {
      this.href = this.href.substring(0, this.href.length - 1);
    }

    this.xmlRpcPath = this.options.xmlRpcPath ?? '';
    if (this.xmlRpcPath.startsWith('/')) {
      this.xmlRpcPath = this.xmlRpcPath.substring(1);
    }
    if (this.xmlRpcPath.endsWith('/')) {
      this.xmlRpcPath = this.xmlRpcPath.substring(0, this.xmlRpcPath.length - 1);
    }

    this.endpoint = `${this.href}/${this.xmlRpcPath}`;
  }

  methodCall(
    method: string,
    params: unknown
  ): Promise<unknown> {
    const xml = this.objectToXml(method, params);
    if (method === 'wp.uploadFile') {
      Logger.log(`Endpoint: ${this.endpoint}, ${method}, requestSize: ${xml.length}`, params);
    } else {
      Logger.log(`Endpoint: ${this.endpoint},${method}, request: ${xml}`, params);
    }
    
    return request({
      url: this.endpoint,
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml',
        'User-Agent': 'obsidian.md'
      },
      body: xml
    })
      .then(res => this.responseXmlToObject(res));
  }

  private objectToXml(method: string, ...obj: unknown[]): string {
    const doc = document.implementation.createDocument('', '', null);
    const methodCall = doc.createElement('methodCall');

    doc.appendChild(methodCall);
    const pi = doc.createProcessingInstruction('xml', 'version="1.0" encoding="UTF-8"');
    doc.insertBefore(pi, doc.firstChild);

    const methodName = doc.createElement('methodName');
    methodName.appendText(method);
    const params = doc.createElement('params');
    methodCall.appendChild(methodName);
    methodCall.appendChild(params);
    obj.forEach(it => this.createParam(it, params, doc));
    return new XMLSerializer().serializeToString(doc);
  }

  private createParam(obj: unknown, params: HTMLElement, doc: XMLDocument): void {
    const param = doc.createElement('param');
    params.appendChild(param);
    this.createValue(obj, param, doc);
  }

  private createValue(data: unknown, parent: HTMLElement, doc: XMLDocument): void {
    const value = doc.createElement('value');
    parent.appendChild(value);
    if (isSafeInteger(data)) {
      const i4 = doc.createElement('i4');
      i4.appendText((data as SafeAny).toString());
      value.appendChild(i4);
    } else if (isNumber(data)) {
      const double = doc.createElement('double');
      double.appendText((data as SafeAny).toString());
      value.appendChild(double);
    } else if (isBoolean(data)) {
      const boolean = doc.createElement('boolean');
      boolean.appendText(data ? '1' : '0');
      value.appendChild(boolean);
    } else if (isDate(data)) {
      const date = doc.createElement('dateTime.iso8601');
      date.appendText(format(data as Date, "yyyyMMdd'T'HH:mm:ss"));
      value.appendChild(date);
    } else if (isArray(data)) {
      const array = doc.createElement('array');
      const arrayData = doc.createElement('data');
      array.appendChild(arrayData);
      (data as unknown[]).forEach(it => this.createValue(it, arrayData, doc));
      value.appendChild(array);
    } else if (isArrayBuffer(data)) {
      const base64 = doc.createElement('base64');
      base64.setText(arrayBufferToBase64(data));
      value.appendChild(base64);
    } else if (isObject(data)) {
      const struct = doc.createElement('struct');
      for (const [ propName, propValue] of Object.entries(data)) {
        const member = doc.createElement('member');
        struct.appendChild(member);
        const memberName = doc.createElement('name');
        memberName.setText(propName);
        member.appendChild(memberName);
        this.createValue(propValue, member, doc);
      }
      value.appendChild(struct);
    } else {
      const string = doc.createElement('string');
      const cdata = doc.createCDATASection((data as SafeAny).toString());
      string.appendChild(cdata);
      value.appendChild(string);
    }
  }

  private responseXmlToObject(xml: string): unknown {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'application/xml');
    const methodResponse = doc.getElementsByTagName('methodResponse')[0];
    const faults = methodResponse.getElementsByTagName('fault');
    let response: unknown;
    if (faults.length > 0) {
      const faultValue = faults[0]
        .children[0] // <value>
        .children[0];
      response = this.fromElement(faultValue);
    } else {
      const responseValue = methodResponse
        .children[0] // <params>
        .children[0] // <param>
        .children[0] // <value>
        .children[0];
      response = this.fromElement(responseValue);
    }
    //console.log(`response: ${xml}`, response);
    return response;
  }

  private fromElement(element: Element): unknown {
    const tagName = element.tagName;
    if (tagName === 'string') {
      return element.getText();
    } else if (tagName === 'i4' || tagName === 'int') {
      return element.getText();
    } else if (tagName === 'double') {
      return element.getText();
    } else if (tagName === 'boolean') {
      return element.getText() === '1';
    } else if (tagName === 'dateTime.iso8601') {
      const datetime = element.getText();
      if (datetime) {
        return parse(datetime, "yyyyMMdd'T'HH:mm:ss", new Date());
      } else {
        return new Date();
      }
    } else if (tagName === 'array') {
      const array = [];
      const arrayValues = element
        .children[0] // <data>
        .children; // <value>s
      for (let i = 0; i < arrayValues.length; i++) {
        array.push(this.fromElement(arrayValues[i].children[0]));
      }
      return array;
    } else if (tagName === 'struct') {
      const struct: SafeAny = {};
      const members = element.children; // <member>s
      for (let i = 0; i < members.length; i++) {
        const member = members[i];
        let name;
        let value;
        for (let memberIndex = 0; memberIndex < member.children.length; memberIndex++) {
          const prop = member.children[memberIndex];
          if (prop.tagName === 'name') {
            name = prop;
          } else if (prop.tagName === 'value') {
            value = prop.children[0];
          }
        }
        // const name = member.getElementsByTagName('name')[0];
        // const value = member.getElementsByTagName('value')[0].children[0];
        if (name && value) {
          struct[name.getText()] = this.fromElement(value);
        }
      }
      return struct;
    }
  }

}
