'use strict';

class CreativeDirectorProvider {
  async interpretMessage() { throw new Error('CreativeDirectorProvider#interpretMessage must be implemented.'); }
  async createCreativeBrief() { throw new Error('CreativeDirectorProvider#createCreativeBrief must be implemented.'); }
  async recommendStoreStrategy() { throw new Error('CreativeDirectorProvider#recommendStoreStrategy must be implemented.'); }
}

module.exports = { CreativeDirectorProvider };
