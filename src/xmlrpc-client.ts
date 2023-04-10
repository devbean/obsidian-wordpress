import { request } from 'obsidian';
// import { create } from 'xmlbuilder2';
// import { XMLBuilder } from 'xmlbuilder2/lib/interfaces';
import { get, isArray, isBoolean, isDate, isNumber, isObject, isSafeInteger } from 'lodash-es';
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

    // const pv = [
    //   0,
    //   'devbean',
    //   'password',
    //   [
    //     'aaa',
    //     'bbb'
    //   ],
    //   1.234,
    //   {
    //     command: 'whoami',
    //     params: [
    //       '-?'
    //     ]
    //   },
    //   new Date(),
    //   false
    // ];
    // const xml = this.objectToXml(method, params).end({ prettyPrint: true });
    const xml = this.objectToXml(method, params);
    // console.log(xml);
    //
    // const xml_str = '<?xml version="1.0"?><methodResponse><fault><value><struct><member><name>faultCode</name><value><int>4</int></value></member><member><name>faultString</name><value><string>Too many parameters.</string></value></member></struct></value></fault></methodResponse>';
    // const xml_obj = this.responseXmlToObject(xml_str);
    // console.log(xml_obj);
    // const xml_str2 = '<?xml version="1.0" encoding="UTF-8"?><methodResponse><params><param><value><array><data><value><i4>0</i4></value><value><string><![CDATA[devbean]]></string></value><value><string><![CDATA[password]]></string></value><value><array><data><value><string><![CDATA[aaa]]></string></value><value><string><![CDATA[bbb]]></string></value></data></array></value><value><double>1.234</double></value><value><struct><member><name>command</name><value><string><![CDATA[whoami]]></string></value></member><member><name>params</name><value><array><data><value><string><![CDATA[-?]]></string></value></data></array></value></member></struct></value><value><dateTime.iso8601>20230407168084385892113:04:18</dateTime.iso8601></value><value><boolean>0</boolean></value></data></array></value></param></params></methodResponse>';
    // const xml_obj2 = this.responseXmlToObject(xml_str2);
    // console.log(xml_obj2);
    // const xml_str3 = '<?xml version="1.0" encoding="UTF-8"?><methodResponse><params><param><value><i4>123</i4><string>xyz</string></value></param></params></methodResponse>';
    // const xml_obj3 = this.responseXmlToObject(xml_str3);
    // console.log(xml_obj3);
    // throw new Error('xxx');

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

  // private objectToXml(method: string, ...obj: unknown[]): XMLBuilder {
  //   const xml = create({ version: '1.0' })
  //     .ele('methodCall')
  //     .ele('methodName').txt(method).up()
  //     .ele('params');
  //   obj.forEach(it => this.createParam(it, xml));
  //   return xml;
  // }

  private createParam(obj: unknown, params: HTMLElement, doc: XMLDocument): void {
    const param = doc.createElement('param');
    params.appendChild(param);
    this.createValue(obj, param, doc);
  }

  // private createParam(obj: unknown, xml: XMLBuilder): void {
  //   const param = xml.ele('param');
  //   this.createValue(obj, param);
  // }

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

  // private createValue(data: unknown, param: XMLBuilder): void {
  //   const value = param.ele('value');
  //   if (isSafeInteger(data)) {
  //     value.ele('i4').txt((data as SafeAny).toString());
  //   } else if (isNumber(data)) {
  //     value.ele('double').txt(data.toString());
  //   } else if (isBoolean(data)) {
  //     value.ele('boolean').txt(data ? '1' : '0');
  //   } else if (isDate(data)) {
  //     value.ele('dateTime.iso8601').txt(format(data as Date, 'yyyyMMddTHH:mm:ss'));
  //   } else if (isArray(data)) {
  //     const array = value
  //       .ele('array')
  //       .ele('data');
  //     (data as unknown[]).forEach(it => this.createValue(it, array));
  //   } else if (isObject(data)) {
  //     const struct = value.ele('struct');
  //     for (const [ prop, value] of Object.entries(data)) {
  //       const member = struct
  //         .ele('member')
  //         .ele('name').txt(prop)
  //         .up();
  //       this.createValue(value, member);
  //     }
  //   } else {
  //     value.ele('string').dat((data as SafeAny).toString());
  //   }
  // }

  // private responseToObject(response: string): unknown {
  //   const res = create(response).end({ format: 'object' });
  //   if (get(res, 'methodResponse.params')) {
  //     return this.fromValue(get(res, 'methodResponse.params.param.value'));
  //   } else if (get(res, 'methodResponse.fault')) {
  //     return this.fromValue(get(res, 'methodResponse.fault.value'));
  //   }
  //   throw new Error('Invalid XML-RPC response.');
  // }

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
    throw new Error('Invalid XML-RPC response.');
    // if (get(doc, 'methodResponse.params')) {
    //   return this.fromValue(get(doc, 'methodResponse.params.param.value'));
    // } else if (get(doc, 'methodResponse.fault')) {
    //   return this.fromValue(get(doc, 'methodResponse.fault.value'));
    // }
    // throw new Error('Invalid XML-RPC response.');
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

  // private fromValue(value: unknown): unknown {
  //   if (get(value, 'i4') || get(value, 'int')) {
  //     return get(value, 'i4') || get(value, 'int');
  //   } else if (get(value, 'double')) {
  //     return get(value, 'double');
  //   } else if (get(value, 'boolean')) {
  //     return get(value, 'boolean') === '1';
  //   } else if (get(value, 'dateTime.iso8601')) {
  //     const datetime = get(value, 'dateTime.iso8601');
  //     if (datetime) {
  //       return parse(datetime, "yyyyMMdd'T'HH:mm:ss", new Date());
  //     } else {
  //       return new Date();
  //     }
  //   } else if (get(value, 'array')) {
  //     const array: unknown[] = [];
  //     const data: unknown = get(value, 'array.data.value');
  //     if (isArray(data)) {
  //       data.forEach((it: unknown) => {
  //         array.push(this.fromValue(it));
  //       });
  //     } else {
  //       array.push(this.fromValue(data));
  //     }
  //     return array;
  //   } else if (get(value, 'struct')) {
  //     const struct: SafeAny = {};
  //     const members: unknown = get(value, 'struct.member');
  //     if (isArray(members)) {
  //       members.forEach((member: unknown) => {
  //         const name = get(member, 'name');
  //         if (name) {
  //           struct[name] = this.fromValue(get(member, 'value'));
  //         }
  //       });
  //     } else {
  //       const name = get(members, 'name');
  //       if (name) {
  //         struct[name] = this.fromValue(get(members, 'value'));
  //       }
  //     }
  //     return struct;
  //   } else {
  //     return get(value, 'string');
  //   }
  // }
}
