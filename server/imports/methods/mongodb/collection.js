import { Meteor } from 'meteor/meteor';
import { MongoDB } from '/server/imports/core';

Meteor.methods({
  async profilingInfo({ sessionId }) {
    const methodArray = [
      {
        profilingInfo: [],
      },
    ];
    return await MongoDB.executeAdmin({ methodArray, sessionId });
  },

  async setProfilingLevel({ level, sessionId }) {
    const methodArray = [
      {
        setProfilingLevel: [level],
      },
    ];
    return await MongoDB.executeAdmin({ methodArray, sessionId });
  },

  async isCapped({ selectedCollection, sessionId }) {
    const methodArray = [
      {
        isCapped: [],
      },
    ];
    return await MongoDB.execute({ selectedCollection, methodArray, sessionId });
  },

  async insertMany({ selectedCollection, docs, options, sessionId }) {
    const methodArray = [
      {
        insertMany: [docs, options],
      },
    ];
    return await MongoDB.execute({ selectedCollection, methodArray, sessionId });
  },

  async indexInformation({ selectedCollection, isFull, sessionId }) {
    const methodArray = [
      {
        indexInformation: [{ full: isFull }],
      },
    ];
    return await MongoDB.execute({ selectedCollection, methodArray, sessionId });
  },

  async geoHaystackSearch({ selectedCollection, xAxis, yAxis, options, sessionId }) {
    const methodArray = [
      {
        geoHaystackSearch: [xAxis, yAxis, options],
      },
    ];
    return await MongoDB.execute({ selectedCollection, methodArray, sessionId });
  },

  async dropIndex({ selectedCollection, indexName, sessionId }) {
    const methodArray = [
      {
        dropIndex: [indexName],
      },
    ];

    return await MongoDB.execute({ selectedCollection, methodArray, sessionId });
  },

  async distinct({ selectedCollection, selector, fieldName, options, sessionId }) {
    const methodArray = [
      {
        distinct: [fieldName, selector, options],
      },
    ];

    return await MongoDB.execute({ selectedCollection, methodArray, sessionId });
  },

  async delete({ selectedCollection, selector, sessionId }) {
    const methodArray = [
      {
        deleteMany: [selector],
      },
    ];

    return await MongoDB.execute({ selectedCollection, methodArray, sessionId });
  },

  async createIndex({ selectedCollection, fields, options, sessionId }) {
    const methodArray = [
      {
        createIndex: [fields, options],
      },
    ];

    return await MongoDB.execute({ selectedCollection, methodArray, sessionId });
  },

  async findOne({ selectedCollection, selector, cursorOptions, sessionId }) {
    const methodArray = [
      {
        find: [selector],
      },
    ];
    Object.keys(cursorOptions).forEach((key) => {
      if (cursorOptions[key]) {
        const obj = {};
        obj[key] = [cursorOptions[key]];
        methodArray.push(obj);
      }
    });
    methodArray.push({ limit: [1] });
    methodArray.push({ next: [] });
    return await MongoDB.execute({ selectedCollection, methodArray, sessionId });
  },

  async find({ selectedCollection, selector, cursorOptions, executeExplain, sessionId }) {
    const methodArray = [
      {
        find: [selector],
      },
    ];
    Object.keys(cursorOptions).forEach((key) => {
      if (cursorOptions[key]) {
        const obj = {};
        obj[key] = [cursorOptions[key]];
        methodArray.push(obj);
      }
    });

    if (executeExplain) methodArray.push({ explain: [] });
    else methodArray.push({ toArray: [] });

    return await MongoDB.execute({ selectedCollection, methodArray, sessionId });
  },

  async findOneAndUpdate({ selectedCollection, selector, setObject, options, sessionId }) {
    const methodArray = [
      {
        findOneAndUpdate: [selector, setObject, options],
      },
    ];
    return await MongoDB.execute({ selectedCollection, methodArray, sessionId });
  },

  async findOneAndReplace({ selectedCollection, selector, replacement, options, sessionId }) {
    const methodArray = [
      {
        findOneAndReplace: [selector, replacement, options],
      },
    ];
    return await MongoDB.execute({ selectedCollection, methodArray, sessionId });
  },

  async findOneAndDelete({ selectedCollection, selector, options, sessionId }) {
    const methodArray = [
      {
        findOneAndDelete: [selector, options],
      },
    ];
    return await MongoDB.execute({ selectedCollection, methodArray, sessionId });
  },

  async aggregate({ selectedCollection, pipeline, options = {}, sessionId }) {
    const methodArray = [
      {
        aggregate: [pipeline, options]
      },
      { toArray: [] }
    ];
    return await MongoDB.execute({ selectedCollection, methodArray, sessionId });
  },

  async count({ selectedCollection, selector, options, sessionId }) {
    const methodArray = [
      {
        countDocuments: [selector, options],
      },
    ];
    return await MongoDB.execute({ selectedCollection, methodArray, sessionId });
  },

  async group({ selectedCollection, keys, condition, initial, reduce, finalize, command, sessionId }) {
    const methodArray = [
      {
        group: [keys, condition, initial, reduce, finalize, command],
      },
    ];

    return await MongoDB.execute({ selectedCollection, methodArray, sessionId });
  },

  async saveFindResult({ selectedCollection, updateObjects, deletedObjectIds, addedObjects, sessionId }) {
    for (let i = 0; i < updateObjects.length; i += 1) {
      const result = await MongoDB.execute({ selectedCollection, methodArray: [{ replaceOne: [{ _id: updateObjects[i]._id }, updateObjects[i], {}] }], sessionId });
      if (result.error) return result;
    }
    if (deletedObjectIds.length > 0) {
      const result = await MongoDB.execute({ selectedCollection, methodArray: [{ deleteMany: [{ _id: { $in: deletedObjectIds } }] }], sessionId });
      if (result.error) return result;
    }
    if (addedObjects.length > 0) {
      const result = await MongoDB.execute({ selectedCollection, methodArray: [{ insertMany: [addedObjects] }], sessionId });
      if (result.error) return result;
    }
  },

  async bulkWrite({ selectedCollection, operations, options, sessionId }) {
    const methodArray = [
      {
        bulkWrite: [operations, options],
      },
    ];
    return await MongoDB.execute({ selectedCollection, methodArray, sessionId });
  },

  async updateOne({ selectedCollection, selector, setObject, options, sessionId }) {
    const methodArray = [
      {
        updateOne: [selector, setObject, options],
      },
    ];
    return await MongoDB.execute({ selectedCollection, methodArray, sessionId });
  },

  async updateMany({ selectedCollection, selector, setObject, options, sessionId }) {
    const methodArray = [
      {
        updateMany: [selector, setObject, options],
      },
    ];
    return await MongoDB.execute({ selectedCollection, methodArray, sessionId });
  },

  async stats({ selectedCollection, options, sessionId }) {
    const methodArray = [
      {
        stats: [options],
      },
    ];
    return await MongoDB.execute({ selectedCollection, methodArray, sessionId });
  },

  async rename({ selectedCollection, newName, options, sessionId }) {
    const methodArray = [
      {
        rename: [newName, options],
      },
    ];

    return await MongoDB.execute({ selectedCollection, methodArray, sessionId, removeCollectionTopology: true });
  },

  async reIndex({ selectedCollection, sessionId }) {
    const methodArray = [
      {
        reIndex: [],
      },
    ];
    return await MongoDB.execute({ selectedCollection, methodArray, sessionId });
  },

  async options({ selectedCollection, sessionId }) {
    const methodArray = [
      {
        options: [],
      },
    ];
    return await MongoDB.execute({ selectedCollection, methodArray, sessionId });
  },

  async dropCollection({ selectedCollection, sessionId }) {
    const methodArray = [
      {
        drop: [],
      },
    ];
    return await MongoDB.execute({ selectedCollection, methodArray, sessionId });
  },

  async mapReduce({ selectedCollection, map, reduce, options, sessionId }) {
    return await MongoDB.executeMapReduce({ selectedCollection, map, reduce, options, sessionId });
  }
});
