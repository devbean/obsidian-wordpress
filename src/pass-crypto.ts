import { isFunction, isNil } from 'lodash-es';

const AES_GCM = 'AES-GCM';
const FORMAT_JWK = 'jwk';

export class PassCrypto {

  constructor() { }

  canUse(): boolean {
    return !isNil(crypto)
      && !isNil(crypto.subtle)
      && isFunction(crypto.getRandomValues)
      && isFunction(crypto.subtle.generateKey)
      && isFunction(crypto.subtle.encrypt)
      && isFunction(crypto.subtle.decrypt)
      && isFunction(crypto.subtle.importKey)
      && isFunction(crypto.subtle.exportKey);
  }

  async encrypt(message: string): Promise<{ encrypted: string, key?: string, vector?: string }> {
    if (this.canUse()) {
      const vector = crypto.getRandomValues(new Uint8Array(12));
      const key = await crypto.subtle.generateKey({
          name: AES_GCM,
          length: 256
        },
        true,
        [ 'encrypt', 'decrypt' ]);
      const encrypted = await crypto.subtle.encrypt({
          name: AES_GCM,
          iv: vector
        },
        key,
        new TextEncoder().encode(message));
      const exportedKey = await crypto.subtle.exportKey(FORMAT_JWK, key);
      return {
        key: JSON.stringify(exportedKey),
        vector: this.bufferToBase64(vector),
        encrypted: this.bufferToBase64(encrypted)
      };
    } else {
      return {
        encrypted: this.reverseString(this.stringToBase64(this.reverseString(message)))
      };
    }
  }

  async decrypt(encrypted: string, key?: string, vector?: string): Promise<string> {
    if (this.canUse()) {
      if (key && vector) {
        const keyObject = JSON.parse(key);
        const thisKey = await crypto.subtle.importKey(FORMAT_JWK, keyObject, {
            name: AES_GCM
          },
          false,
          [ 'encrypt', 'decrypt' ]);
        const decrypted = await crypto.subtle.decrypt({
            name: AES_GCM,
            iv: this.base64ToBuffer(vector)
          },
          thisKey,
          this.base64ToBuffer(encrypted));
        return new TextDecoder().decode(decrypted);
      }
      return 'xx';
    } else {
      return this.reverseString(this.base64ToString(this.reverseString(encrypted)));
    }
  }

  private bufferToBase64(buffer: ArrayBuffer): string {
    let result = '';
    new Uint8Array(buffer).forEach(b => result += String.fromCharCode(b));
    return btoa(result);
  }

  private base64ToBuffer(base64: string): ArrayBuffer {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }

  private reverseString(str: string): string {
    return str.split('').reverse().join('');
  }

  private stringToBase64(str: string): string {
    return btoa(str);
  }

  private base64ToString(base64: string): string {
    return atob(base64);
  }

}
