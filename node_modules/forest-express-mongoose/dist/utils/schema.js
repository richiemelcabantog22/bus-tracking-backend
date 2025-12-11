"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
var _toArray2 = _interopRequireDefault(require("@babel/runtime/helpers/toArray"));
exports.getReferenceModel = function (options, reference) {
  var connections = options.connections;
  return Object.values(connections).reduce(function (models, connection) {
    return models.concat(Object.values(connection.models));
  }, []).find(function (model) {
    return exports.getModelName(model) === exports.getReferenceCollectionName(reference);
  });
};
exports.getReferenceField = function (reference) {
  return reference.split('.')[1];
};
exports.getReferenceCollectionName = function (reference) {
  return reference.split('.')[0];
};
exports.getModelName = function (model) {
  return model.modelName;
};

// TODO: Remove nameOld attribute once the lianas versions older than 2.0.0 are minority
exports.getModelNameOld = function (model) {
  return model.collection.name.replace(' ', '');
};
var _require = require('../services/flattener'),
  FLATTEN_SEPARATOR = _require.FLATTEN_SEPARATOR;
var getNestedFieldType = function getNestedFieldType(mongooseSchema, nestedFieldPath) {
  var _mongooseSchema$tree, _mongooseSchema$type, _mongooseSchema$type2, _mongooseSchema$type3;
  if (!mongooseSchema || !nestedFieldPath) return undefined;
  var _nestedFieldPath$spli = nestedFieldPath.split(FLATTEN_SEPARATOR),
    _nestedFieldPath$spli2 = (0, _toArray2["default"])(_nestedFieldPath$spli),
    currentFieldName = _nestedFieldPath$spli2[0],
    deepNestedFieldPath = _nestedFieldPath$spli2.slice(1);
  var nestedFieldDeclaration;
  if ((_mongooseSchema$tree = mongooseSchema.tree) !== null && _mongooseSchema$tree !== void 0 && _mongooseSchema$tree[currentFieldName]) {
    nestedFieldDeclaration = mongooseSchema.tree[currentFieldName];
  } else if ((_mongooseSchema$type = mongooseSchema.type) !== null && _mongooseSchema$type !== void 0 && _mongooseSchema$type[currentFieldName]) {
    nestedFieldDeclaration = mongooseSchema.type[currentFieldName];
  } else if (mongooseSchema[currentFieldName]) {
    nestedFieldDeclaration = mongooseSchema[currentFieldName];
  } else if ((_mongooseSchema$type2 = mongooseSchema.type) !== null && _mongooseSchema$type2 !== void 0 && (_mongooseSchema$type3 = _mongooseSchema$type2.tree) !== null && _mongooseSchema$type3 !== void 0 && _mongooseSchema$type3[currentFieldName]) {
    var _mongooseSchema$type4, _mongooseSchema$type5;
    nestedFieldDeclaration = (_mongooseSchema$type4 = mongooseSchema.type) === null || _mongooseSchema$type4 === void 0 ? void 0 : (_mongooseSchema$type5 = _mongooseSchema$type4.tree) === null || _mongooseSchema$type5 === void 0 ? void 0 : _mongooseSchema$type5[currentFieldName];
  }
  if (!nestedFieldDeclaration) return undefined;
  if (!deepNestedFieldPath.length) {
    return nestedFieldDeclaration.type || nestedFieldDeclaration;
  }
  return getNestedFieldType(nestedFieldDeclaration, deepNestedFieldPath === null || deepNestedFieldPath === void 0 ? void 0 : deepNestedFieldPath.join(FLATTEN_SEPARATOR));
};
exports.getNestedFieldType = getNestedFieldType;
exports.getMongooseSchemaFromFieldPath = function (fieldPath, model) {
  return model.schema.paths[fieldPath] || model.schema.singleNestedPaths[fieldPath] || null;
};