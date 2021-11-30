export interface WordPressClient {
  publish(): Promise<boolean>;
}

class WpXmlRpcClient implements WordPressClient {

  publish(): Promise<boolean> {
    return Promise.resolve(false);
  }

}
