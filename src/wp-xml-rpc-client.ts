import { Notice } from 'obsidian';
import WordpressPlugin from './main';
import {
  WordPressAuthParams,
  WordPressClientResult,
  WordPressClientReturnCode,
  WordPressMediaUploadResult,
  WordPressPostParams,
  WordPressPublishResult
} from './wp-client';
import { XmlRpcClient } from './xmlrpc-client';
import { AbstractWordPressClient } from './abstract-wp-client';
import { Term } from './wp-api';
import { ERROR_NOTICE_TIMEOUT } from './consts';
import { SafeAny } from './utils';
import { WpProfile } from './wp-profile';
import { Media } from './types';

interface FaultResponse {
  faultCode: string;
  faultString: string;
}

function isFaultResponse(response: unknown): response is FaultResponse {
  return (response as FaultResponse).faultCode !== undefined;
}

export class WpXmlRpcClient extends AbstractWordPressClient {

  private readonly client: XmlRpcClient;

  constructor(
    readonly plugin: WordpressPlugin,
    readonly profile: WpProfile
  ) {
    super(plugin, profile);
    this.name = 'WpXmlRpcClient';
    this.client = new XmlRpcClient({
      url: new URL(profile.endpoint),
      xmlRpcPath: profile.xmlRpcPath ?? ''
    });
  }

  async publish(
    title: string,
    content: string,
    postParams: WordPressPostParams,
    certificate: WordPressAuthParams
  ): Promise<WordPressClientResult<WordPressPublishResult>> {
    const publishContent = {
      post_type: 'post',
      post_status: postParams.status,
      comment_status: postParams.commentStatus,
      post_title: title,
      post_content: content,
      terms: {
        'category': postParams.categories
      },
      terms_names: {
        'post_tag': postParams.tags
      }
    };
    let publishPromise;
    if (postParams.postId) {
      publishPromise = this.client.methodCall('wp.editPost', [
        0,
        certificate.username,
        certificate.password,
        postParams.postId,
        publishContent
      ]);
    } else {
      publishPromise = this.client.methodCall('wp.newPost', [
        0,
        certificate.username,
        certificate.password,
        publishContent
      ]);
    }
    const response = await publishPromise;
    if (isFaultResponse(response)) {
      return {
        code: WordPressClientReturnCode.Error,
        error: {
          code: response.faultCode,
          message: response.faultString
        },
        response
      };
    }
    return {
      code: WordPressClientReturnCode.OK,
      data: {
        postId: postParams.postId ?? (response as string),
        categories: postParams.categories
      },
      response
    };
  }

  async getCategories(certificate: WordPressAuthParams): Promise<Term[]> {
    const response = await this.client.methodCall('wp.getTerms', [
      0,
      certificate.username,
      certificate.password,
      'category'
    ]);
    if (isFaultResponse(response)) {
      const fault = `${response.faultCode}: ${response.faultString}`;
      new Notice(fault, ERROR_NOTICE_TIMEOUT);
      throw new Error(fault);
    }
    return (response as SafeAny).map((it: SafeAny) => ({
      ...it,
      id: it.term_id
    })) ?? [];
  }

  async validateUser(certificate: WordPressAuthParams): Promise<WordPressClientResult<boolean>> {
    const response = await this.client.methodCall('wp.getProfile', [
      0,
      certificate.username,
      certificate.password
    ]);
    if (isFaultResponse(response)) {
      return {
        code: WordPressClientReturnCode.Error,
        error: {
          code: response.faultCode,
          message: `${response.faultCode}: ${response.faultString}`
        },
        response
      };
    } else {
      return {
        code: WordPressClientReturnCode.OK,
        data: !!response,
        response
      };
    }
  }

  getTag(name: string, certificate: WordPressAuthParams): Promise<Term> {
    return Promise.resolve({
      id: name,
      name,
      slug: name,
      taxonomy: 'post_tag',
      description: name,
      count: 0
    });
  }

  async uploadMedia(media: Media, certificate: WordPressAuthParams): Promise<WordPressClientResult<WordPressMediaUploadResult>> {
    const wpMedia = {
      name: media.fileName,
      type: media.mimeType,
      bits: media.content,
    };
    const response = await this.client.methodCall('wp.uploadFile', [
      0,
      certificate.username,
      certificate.password,
      wpMedia,
    ]);
    if (isFaultResponse(response)) {
      return {
        code: WordPressClientReturnCode.Error,
        error: {
          code: response.faultCode,
          message: `${response.faultCode}: ${response.faultString}`
        },
        response
      };
    } else {
      return {
        code: WordPressClientReturnCode.OK,
        data: {
          url: (response as SafeAny).url
        },
        response
      };
    }
  }

}
