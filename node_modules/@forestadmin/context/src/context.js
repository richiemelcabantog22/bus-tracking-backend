const Metadata = require('./metadata');

module.exports = class Context {
  constructor() {
    this._bag = {};
    this._bag.assertPresent = this._makeAssertPresent(this._bag).bind(this);
    this._metadata = new Metadata();
    this._currentStepIgnorable = null;
  }

  seal() {
    this.flushPrivates('');
    this._metadata.seal();
  }

  get() { return this._bag; }

  getMetadata() {
    return this._metadata.get();
  }

  _makeAssertPresent(bag) {
    return (requisites, rest) => {
      if (rest) throw new Error('Asserting dependencies - Only one parameter should be specified.');
      const keys = Object.keys(requisites);
      const missingKeys = keys
        .filter((key) => !Object.prototype.hasOwnProperty.call(bag, key));
      if (missingKeys.length > 0) throw new Error(`Asserting dependencies on path "${this._metadata.getCurrentPath()}": Missing dependencies: "${missingKeys}"`);

      const undefinedKeys = keys
        .filter((key) => bag[key] === undefined);

      if (undefinedKeys.length > 0) throw new Error(`Asserting dependencies on path "${this._metadata.getCurrentPath()}": Undefined dependencies: "${undefinedKeys}"`);

      this._metadata.setRequisites(keys);
      return true;
    };
  }

  openStep(path, name, options) {
    if (this._tryMarkCurrentStepAsIgnored(path, options)) return;
    this._metadata.add(path, name, 'step', null, options);
  }

  closeStep(path) {
    this._currentStepIgnorable = null;
    this.flushPrivates(path);
  }

  _tryMarkCurrentStepAsIgnored(path, options) {
    if (options) {
      const optionsIfIsFalse = typeof options.if === 'boolean' && !options.if;
      const contextValueDoesNotExists = typeof options.if === 'string' && this.get()[options.if] === undefined;
      const contextValueIsFalsy = typeof options.if === 'string' && !this.get()[options.if];

      if (contextValueDoesNotExists) throw new Error(`Adding package on path '${path}': Invalid option 'if': Key '${options.if}' does not exist in the context`);

      if (optionsIfIsFalse || contextValueIsFalsy) {
        this._currentStepIgnorable = path;
        return true;
      }
    }
    return false;
  }

  isEntryIgnorable({ path, type }) {
    const currentStepIsIgnored = this._currentStepIgnorable !== null;
    const entryIsStepOut = type === 'step-out';
    const entryPathEqualsCurrentlyIgnoredPath = this._currentStepIgnorable === path;
    const entryIsClosingCurrentIgnoredStep = entryIsStepOut && entryPathEqualsCurrentlyIgnoredPath;

    return currentStepIsIgnored && !entryIsClosingCurrentIgnoredStep;
  }

  flushPrivates(path) {
    [
      ...this._metadata.findPrivateValuesInStep(path),
      ...this._metadata.findValuesInPrivateSubSteps(path),
    ].forEach((name) => delete this._bag[name]);
  }

  _setValue(name, value) {
    this._bag[name] = value;
    return this;
  }

  _checkKeyAvailable(name) {
    if (this._bag[name]) throw new Error(`Key already exists on another path: "${this._metadata.getPath(name)}"`);
  }

  _checkKeyNotAvailable(name) {
    (Array.isArray(name) ? name : [name]).forEach((key) => {
      if (!this._bag[key]) throw new Error(`Key does not exists: ${key}`);
    });
  }

  _setNewValue(name, value, options = {}) {
    this._setValue(name, value, options);
  }

  addReplacement(path, name, value, options) {
    try {
      this._checkKeyAvailable(name);
      this._metadata.add(path, name, 'replacement', value, options);
      this._setNewValue(name, value, options);
      return this;
    } catch (cause) {
      throw new Error(`Adding replacement on path "${path}/${name}": ${cause.message}`, { cause });
    }
  }

  addValue(path, name, value, options) {
    try {
      this._checkKeyAvailable(name);
      this._metadata.add(path, name, 'value', value, options);

      const realValue = (typeof value === 'function') ? value(this.get()) : value;

      if (realValue === undefined) throw new Error(`Specified value is undefined: ${path}/${name}`);

      this._setNewValue(
        name,
        realValue,
        options,
      );
      return this;
    } catch (cause) {
      throw new Error(`Adding value on path "${path}/${name}": ${cause.message}`, { cause });
    }
  }

  addAlias(path, name, value, options) {
    try {
      this._checkKeyAvailable(name);
      this._checkKeyNotAvailable(value);
      this._metadata.add(path, name, 'alias', value, options);
      this._setNewValue(name, this._bag[value], options);
      return this;
    } catch (cause) {
      throw new Error(`Adding alias on path "${path}/${name}": ${cause.message}`, { cause });
    }
  }

  addRawValue(path, name, value, options) {
    try {
      this._checkKeyAvailable(name);
      this._metadata.add(path, name, 'value', value, options);
      this._setNewValue(name, value, options);
      return this;
    } catch (cause) {
      throw new Error(`Adding raw value on path "${path}/${name}": ${cause.message}`, { cause });
    }
  }

  addNumber(path, name, value, options = {}) {
    try {
      this._checkKeyAvailable(name);
      this._metadata.add(path, name, 'number', value, options);
      const {
        min = Number.NEGATIVE_INFINITY,
        default: defaultValue,
        max = Number.POSITIVE_INFINITY,
        nullable,
      } = options;
      const rawValue = (typeof value === 'function') ? value(this.get()) : value;
      if (rawValue === null) {
        if (!nullable) throw new Error('Specified value is null');
        this._setNewValue(name, rawValue, options);
        return this;
      }
      if (rawValue === undefined) {
        if (defaultValue === undefined) throw new Error('No specified value and no default value');
        this._setNewValue(name, defaultValue, options);
        return this;
      }

      const expectedNumber = Number(rawValue);
      if (Number.isNaN(expectedNumber)) {
        if (!defaultValue) throw new Error(`Specified value is not a number: "${rawValue}"`);
        this._setNewValue(name, defaultValue, options);
        return this;
      }
      if (expectedNumber < min) throw new Error(`Specified value is below min: "${expectedNumber}" (min=${min})`);
      if (max < expectedNumber) throw new Error(`Specified value is above max: "${expectedNumber}" (max=${max})`);

      this._setNewValue(name, expectedNumber, options);
      return this;
    } catch (cause) {
      throw new Error(`Adding number on path "${path}/${name}": ${cause.message}`, { cause });
    }
  }

  addInstance(path, name, instance, options) {
    try {
      this._checkKeyAvailable(name);
      this._metadata.add(path, name, 'instance', instance, options);
      this._setNewValue(
        name,
        (typeof instance === 'function') ? instance(this.get()) : instance,
        options,
      );
      return this;
    } catch (cause) {
      throw new Error(`Adding instance on path "${path}/${name}": ${cause.message}`, { cause });
    }
  }

  addFunction(path, name, theFunction, options) {
    try {
      this._checkKeyAvailable(name);
      this._metadata.add(path, name, 'function', theFunction, options);
      this._setNewValue(name, theFunction, options);
      return this;
    } catch (cause) {
      throw new Error(`Adding function on path "${path}/${name}": ${cause.message}`, { cause });
    }
  }

  addUsingFunction(path, name, factoryFunction, options) {
    try {
      this._checkKeyAvailable(name);
      this._metadata.add(path, name, 'function*', factoryFunction, options);
      const bag = this.get();
      const value = factoryFunction(bag);

      if (value === undefined) {
        throw new Error('Factory function returned undefined');
      }

      this._setNewValue(name, value, options);
      return this;
    } catch (cause) {
      throw new Error(`Using factory function on path "${path}/${name}": ${cause.message}`, { cause });
    }
  }

  addUsingFunctionStack(path, name, factoryFunctionList, options) {
    try {
      this._checkKeyAvailable(name);
      this._metadata.add(path, name, 'function**', factoryFunctionList, options);
      factoryFunctionList.forEach((factoryFunction) => {
        const bag = this.get();
        const value = factoryFunction(bag);

        if (value === undefined) {
          throw new Error(`Factory function returned undefined ${factoryFunction.name}`);
        }

        this._setValue(name, value, options);
      });

      return this;
    } catch (cause) {
      throw new Error(`Using factory function stack on path "${path}/${name}": ${cause.message}`, { cause });
    }
  }

  addUsingClass(path, name, Class, options) {
    try {
      this._checkKeyAvailable(name);
      this._metadata.add(path, name, 'class', Class, options);
      const instance = this._instanciate(path, name, Class, options);
      this._setNewValue(name, instance, options);
      return this;
    } catch (cause) {
      throw new Error(`Using class on path "${path}/${name}": ${cause.message}`, { cause });
    }
  }

  addModule(path, name, module, options) {
    try {
      this._checkKeyAvailable(name);
      this._metadata.add(path, name, 'module', module, options);
      this._setNewValue(
        name,
        (typeof module === 'function') ? module() : module,
        options,
      );
      return this;
    } catch (cause) {
      throw new Error(`Using module on path "${path}/${name}": ${cause.message}`, { cause });
    }
  }

  with(path, name, work) {
    try {
      this._checkKeyNotAvailable(name);
      work(this._lookup(name));
      return this;
    } catch (cause) {
      throw new Error(`Using with on path "${path}/${name}": ${cause.message}`, { cause });
    }
  }

  _instanciate(path, name, FunctionFactory, { map } = {}) {
    try {
      const isClass = FunctionFactory.toString().startsWith('class');
      const ClassToInstanciate = isClass ? FunctionFactory : FunctionFactory();
      const localContext = map ? this._mapContext(map) : this.get();
      return new ClassToInstanciate(localContext);
    } catch (cause) {
      throw new Error(`Instanciating class on path "${path}/${name}" - ${cause.message}`, { cause });
    }
  }

  static _makeMapping(bag, map) {
    const mappedBag = {};
    const unknownKeys = [];
    Object.keys(map).forEach((key) => {
      if (bag[map[key]] === undefined) unknownKeys.push(key);
      mappedBag[key] = bag[map[key]];
    });
    if (unknownKeys.length > 0) throw new Error(`mapping error, key(s) not found: ${unknownKeys.join(', ')}`);
    return mappedBag;
  }

  _mapContext(map) {
    const bag = this.get();
    if (!map) return bag;
    const mappedBag = {
      ...bag,
      ...Context._makeMapping(bag, map),
    };
    mappedBag.assertPresent = this._makeAssertPresent(mappedBag);
    return mappedBag;
  }

  _lookup(name) {
    const bag = this.get();
    if (Array.isArray(name)) {
      const dependanciesArray = name.map((key) => bag[key]);
      const dependanciesObject = {};
      name.forEach((key, i) => {
        dependanciesObject[key] = dependanciesArray[i];
      });
      return dependanciesObject;
    }
    return bag[name];
  }
};
