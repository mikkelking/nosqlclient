import * as collections from "/lib/imports/collections";

const Database = function Database() {
  this.types = {
    Actions: collections.Actions,
    Connections: collections.Connections,
    Dumps: collections.Dumps,
    QueryHistory: collections.QueryHistory,
    SchemaAnalyzeResult: collections.SchemaAnalyzeResult,
    Settings: collections.Settings,
    ShellCommands: collections.ShellCommands,
  };
};

const resolveType = function (types, type) {
  if (Object.prototype.toString.call(type) === "[object String]") return types[type];
  return type;
};

Database.prototype = {
  async create({ type, document }) {
    return await resolveType(this.types, type).insertAsync(document);
  },

  async read({ type, query, queryOptions = {} }) {
    return await resolveType(this.types, type).find(query, queryOptions).fetchAsync();
  },

  async readOne({ type, query, queryOptions = {} }) {
    return await resolveType(this.types, type).findOneAsync(query, queryOptions);
  },

  async count({ type, query, queryOptions = {} }) {
    return await resolveType(this.types, type).find(query, queryOptions).countAsync();
  },

  async updateAsync({ type, selector, modifier, options = {} }) {
    return await resolveType(this.types, type).updateAsync(selector, modifier, options);
  },

  async removeAsync({ type, selector }) {
    return await resolveType(this.types, type).removeAsync(selector);
  },

  // aliases
  insert({ type, document }) {
    return this.create({ type, document });
  },

  find({ type, query, isSingle = false, queryOptions = {} }) {
    return this.read({ type, queryOptions, isSingle, query });
  },
};

export default new Database();
