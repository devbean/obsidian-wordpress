import { ChildNode } from 'domhandler';

const enum BlockType {
  Paragraph = 'wp:paragraph',
  Heading = 'wp:heading',
  Image = 'wp:image',
  List = 'wp:list', // ol and ul
  ListItem = 'wp:list-item',
  Table = 'wp:table',
  Separator = 'wp:separator',
  Quote = 'wp:quote',
  Code = 'wp:code',
  Details = 'wp:details' // Callout
}

const HeadingAttrs = {
  level: 2,
};

const ListAttrs = {
  ordered: false,
};

class Block {
  node: Element | null = null;

  type = BlockType.Paragraph;

  attrs = {};

  children: Block[] = [];


  constructor(
    node: Element,
  ) {
    this.node = node;
    this.parseNodeDetails();
  }

  parseNodeDetails() {
    if (!this.node) {
      return;
    }

    const tagName = this.node.tagName;
    let addClass = '';

    switch (tagName) {
      case 'H1':
      case 'H2':
      case 'H3':
      case 'H4':
      case 'H5':
      case 'H6':
        this.type = BlockType.Heading;
        this.attrs = {
          ...HeadingAttrs,
          level: parseInt(tagName[1]),
        };
        addClass = 'wp-block-heading';
        break;

      case 'HR':
        this.type = BlockType.Separator;
        addClass = 'wp-block-separator';
        break;

      case 'TABLE':
        this.type = BlockType.Table;
        addClass = 'wp-block-table';
        this.node = wrapNode(this.node, 'figure');
        break;

      case 'OL':
      case 'UL':
        this.type = BlockType.List;
        this.attrs = {
          ...ListAttrs,
          ordered: 'OL' === tagName,
        };
        this.children = findBlocks(this.node.childNodes);
        break;

      case 'LI':
        this.type = BlockType.ListItem;
        break;

      case 'BLOCKQUOTE':
        this.type = BlockType.Quote;
        addClass = 'wp-block-quote';
        this.children = findBlocks(this.node.childNodes);
        break;

      case 'PRE':
        this.type = BlockType.Code;
        addClass = 'wp-block-code';

        // Remove the trailing whitespace (line break) from the code
        this.node.querySelectorAll('code').forEach((code) => {
          let text = code.textContent || '';
          code.className = '';
          code.textContent = text.replace(/\s+$/, '');
        });
        break;

      // Images are wrapped inside a <p> tag.
      case 'P':
        if (this.node.innerHTML.startsWith('<img ')) {
          let imgNode = unwrapNode(this.node, 'img');

          if (imgNode) {
            this.node = wrapNode(imgNode, 'figure');
            this.type = BlockType.Image;
            addClass = 'wp-block-image';
          }
        }
        break;
    }

    if (addClass) {
      this.node.classList.add(addClass);
    }

    this.children.forEach((child, index) => {
      if (!this.node || !child.node) {
        return;
      }

      const blockId = `${child.type}-${index}`;
      const placeholder = document.createElement('ChildBlock');
      placeholder.setAttribute('blockId', blockId);
      this.node.replaceChild(placeholder, child.node);
    });
  }

  render(): string {
    if (!this.node) {
      return '';
    }

    // Get the block start and end tags (HTML comments)
    const startTag = this.getStartTag();
    const endTag = this.getEndTag();
    let html = this.node.outerHTML;

    // Replace each placeholder with the corresponding child's rendered HTML
    this.children.forEach((child, index) => {
      const blockId = `${child.type}-${index}`;
      const childHtml = child.render();

      const placeholderRegex = new RegExp(`<ChildBlock blockId="${blockId}".*?</ChildBlock>`, 'gi');
      html = html.replace(placeholderRegex, childHtml);
    });

    return `${startTag}\n${html}\n${endTag}`;
  }

  getStartTag(): string {
    let block: string = this.type;

    if (Object.keys(this.attrs).length) {
      block += ` ${JSON.stringify(this.attrs)}`;
    }

    return `<!-- ${block} -->`;
  }

  getEndTag(): string {
    return `<!-- /${this.type} -->`;
  }
}

export function convertHtmlToBlocks(html: string): string {
  const blocks = splitHtmlIntoBlocks(html);
  const output: string[] = [];

  blocks.forEach(block => {
    output.push(block.render());
  });

  return output.join('\n\n');
}

function splitHtmlIntoBlocks(html: string): Block[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const body = doc.body;

  return findBlocks(body.childNodes);
}

function findBlocks(nodes: NodeList): Block[] {
  const blocks: Block[] = [];

  nodes.forEach(node => {
    if (node.nodeType !== Node.ELEMENT_NODE) {
      return;
    }

    blocks.push(new Block(node as Element));
  });

  return blocks;
}

function wrapNode(node: Element, wrapperTag: string): Element {
  const wrapper = document.createElement(wrapperTag);

  wrapper.appendChild(node);

  return wrapper;
}


function unwrapNode(node: Element, selector: string): Element | null {
  return node.querySelector(selector);
}
