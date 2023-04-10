import { request } from 'obsidian';
import { isArray, isBoolean, isDate, isNumber, isObject, isSafeInteger } from 'lodash-es';
import { format, parse } from 'date-fns';
import { SafeAny } from './utils';

interface XmlRpcOptions {
  url: URL;
  xmlRpcPath: string;
}

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
    console.log(options);

    this.href = this.options.url.href;
    if (this.href.endsWith('/')) {
      this.href = this.href.substring(0, this.href.length - 1);
    }

    this.xmlRpcPath = this.options.xmlRpcPath;
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
    console.log(`Endpoint: ${this.endpoint}, ${method}`, params);

    const xml = this.objectToXml(method, params);
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
      date.appendText(format(data as Date, 'yyyyMMddTHH:mm:ss'));
      value.appendChild(date);
    } else if (isArray(data)) {
      const array = doc.createElement('array');
      const arrayData = doc.createElement('data');
      array.appendChild(arrayData);
      (data as unknown[]).forEach(it => this.createValue(it, arrayData, doc));
      value.appendChild(array);
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
    if (faults.length > 0) {
      const faultValue = faults[0]
        .getElementsByTagName('value')[0]
        .children;
      return this.fromValue(faultValue);
    } else {
      const responseValue = methodResponse
        .getElementsByTagName('params')[0]
        .getElementsByTagName('param')[0]
        .getElementsByTagName('value')[0]
        .children;
      return this.fromValue(responseValue);
    }
  }

  private fromValue(collection: HTMLCollection): unknown {
    for (let i = 0; i < collection.length; i++) {
      const element = collection[i];
      this.fromElement(element);
    }
    return {};
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
        .getElementsByTagName('data')[0]
        .getElementsByTagName('value');
      for (let i = 0; i < arrayValues.length; i++) {
        const arrayElement = arrayValues[i].children[0];
        array.push(this.fromElement(arrayElement));
      }
      return array;
    } else if (tagName === 'struct') {
      const struct: SafeAny = {};
      const members = element.getElementsByTagName('member');
      for (let i = 0; i < members.length; i++) {
        const member = members[i];
        const name = member.getElementsByTagName('name')[0];
        const value = member.getElementsByTagName('value')[0].children[0];
        struct[name.getText()] = this.fromElement(value);
      }
      return struct;
    }
  }

}
