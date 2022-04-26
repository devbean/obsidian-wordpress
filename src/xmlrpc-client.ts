import { request } from 'obsidian';
import { create } from 'xmlbuilder2';
import { XMLBuilder } from 'xmlbuilder2/lib/interfaces';
import { get, isArray, isBoolean, isDate, isNumber, isObject, isSafeInteger } from 'lodash-es';
import { format, parse } from 'date-fns';

interface XmlRpcOptions {
  url: URL;
}

export class XmlRpcClient {

  constructor(
    private readonly options: XmlRpcOptions
  ) {
    console.log(options);
  }

  methodCall(
    method: string,
    params: unknown
  ): Promise<unknown> {
    console.log(`Endpoint: ${this.options.url.href}xmlrpc.php`);

    const xml = this.objectToXml(method, params).end({ prettyPrint: true });
    console.log(xml);

    return request({
      url: `${this.options.url.href}xmlrpc.php`,
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml',
        'User-Agent': 'obsidian.md'
      },
      body: xml
    })
      .then(res => {
        console.log(res);
        return this.responseToObject(res);
      });
  }

  private objectToXml(method: string, ...obj: unknown[]): XMLBuilder {
    const xml = create({ version: '1.0' })
      .ele('methodCall')
      .ele('methodName').txt(method).up()
      .ele('params');
    obj.forEach(it => this.createParam(it, xml));
    return xml;
  }

  private createParam(obj: unknown, xml: XMLBuilder): void {
    const param = xml.ele('param');
    this.createValue(obj, param);
  }

  private createValue(data: unknown, param: XMLBuilder): void {
    const value = param.ele('value');
    if (isSafeInteger(data)) {
      value.ele('i4').txt(data.toString());
    } else if (isNumber(data)) {
      value.ele('double').txt(data.toString());
    } else if (isBoolean(data)) {
      value.ele('boolean').txt(data ? '1' : '0');
    } else if (isDate(data)) {
      value.ele('dateTime.iso8601').txt(format(data as Date, 'yyyyMMddTHH:mm:ss'));
    } else if (isArray(data)) {
      const array = value
        .ele('array')
        .ele('data');
      (data as unknown[]).forEach(it => this.createValue(it, array));
    } else if (isObject(data)) {
      const struct = value.ele('struct');
      for (const [ prop, value] of Object.entries(data)) {
        const member = struct
          .ele('member')
          .ele('name').txt(prop)
          .up();
        this.createValue(value, member);
      }
    } else {
      value.ele('string').dat(data.toString());
    }
  }

  private responseToObject(response: string): unknown {
    const res = create(response).end({ format: 'object' });
    if (get(res, 'methodResponse.params')) {
      return this.fromValue(get(res, 'methodResponse.params.param.value'));
    } else if (get(res, 'methodResponse.fault')) {
      return this.fromValue(get(res, 'methodResponse.fault.value'));
    }
    throw new Error('Invalid XML-RPC response.');
  }

  private fromValue(value: unknown): unknown {
    if (get(value, 'i4') || get(value, 'int')) {
      return get(value, 'i4') || get(value, 'int');
    } else if (get(value, 'double')) {
      return get(value, 'double');
    } else if (get(value, 'boolean')) {
      return get(value, 'boolean') === '1';
    } else if (get(value, 'dateTime.iso8601')) {
      return parse(get(value, 'dateTime.iso8601'), 'yyyyMMddTHH:mm:ss', new Date());
    } else if (get(value, 'array')) {
      const array: unknown[] = [];
      const data = get(value, 'array.data.value');
      if (isArray(data)) {
        data.forEach((it: unknown) => {
          array.push(this.fromValue(it));
        });
      } else {
        array.push(this.fromValue(data));
      }
      return array;
    } else if (get(value, 'struct')) {
      const struct: any = {}; // eslint-disable-line
      const members = get(value, 'struct.member');
      if (isArray(members)) {
        members.forEach((member: unknown) => {
          struct[get(member, 'name')] = this.fromValue(get(member, 'value'));
        });
      } else {
        struct[get(members, 'name')] = this.fromValue(get(members, 'value'));
      }
      return struct;
    } else {
      return get(value, 'string');
    }
  }
}
