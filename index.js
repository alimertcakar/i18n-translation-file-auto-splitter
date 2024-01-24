const fs = require("fs");
const path = require("path");

const markedForDeletion = "[[MARKED_FOR_DELETION]]";
const translationKeyMatcher = /["'](.*?)["']/g;
// i am a badass variable
let systemSlashType = "/"; // for windows -> \ for else -> /

// 'src/pages/Users/UserDetail/UserDetail.jsx' -> Users
const getNamespace = (path) => {
  // save to common.json if we are not under pages directory
  if (!path.includes("pages")) return "common";
  const parts = path.includes("\\") ? path.split("\\") : path.split("/");
  if (path.includes("\\")) systemSlashType = "\\";
  return parts[parts.indexOf("pages") + 1];
};
const getSrcNamespace = (path) => {
  const parts = path.includes("\\") ? path.split("\\") : path.split("/");
  if (path.includes("\\")) systemSlashType = "\\";
  const result = parts[parts.indexOf("src") + 1];
  return result !== "pages" ? result : null;
};

const getFileName = (path) => {
  const parts = path.includes("\\") ? path.split("\\") : path.split("/");
  return parts[parts.length - 1];
};

const isFile = (fileName) => {
  return fs.lstatSync(fileName).isFile();
};
const isDirectory = (fileName) => {
  return fs.lstatSync(fileName).isDirectory();
};

const isTargetedFile = (fileName) => {
  return (
    fileName.endsWith(".js") ||
    fileName.endsWith(".jsx") ||
    fileName.endsWith(".ts") ||
    fileName.endsWith(".tsx")
  );
};
const isJsonFile = (fileName) => {
  return fileName.endsWith(".json");
};

/* Implementation of lodash.get function */
function getProp(object, keys, defaultVal) {
  keys = Array.isArray(keys) ? keys : keys.split(".");
  object = object[keys[0]];
  if (object && keys.length > 1) {
    return getProp(object, keys.slice(1));
  }
  return object === undefined ? defaultVal : object;
}

/* Implementation of lodash.unset function */
function unsetProp(object, keys) {
  keys = Array.isArray(keys) ? keys : keys.split(".");
  if (keys.length === 1) {
    delete object[keys[0]];
  } else {
    const prop = keys.shift();
    unsetProp(object[prop], keys);
    if (Object.keys(object[prop]).length === 0) {
      delete object[prop];
    }
  }
}

const defaultTranslationMatcher = /\b(?<![A-Z])t\(["'].*\)/g;

const findTranslationCallsIn = (
  folderPath,
  translationMatcher = defaultTranslationMatcher
) => {
  const directoryContents = fs.readdirSync(folderPath).map((fileName) => {
    return path.join(folderPath, fileName);
  });
  const files = directoryContents.filter(isFile);
  const directories = directoryContents.filter(isDirectory);

  let subDirectoryContents = {};
  directories.forEach((directory) => {
    subDirectoryContents[directory] = findTranslationCallsIn(directory);
  });
  let fileContents = {};
  files.forEach((file) => {
    const readedFile = fs.readFileSync(file, "utf-8");
    if (isTargetedFile(file)) {
      fileContents[file] = readedFile.match(translationMatcher);
    }
  });
  const result = { ...subDirectoryContents, ...fileContents };
  return result;
};

const findTranslationFilesInDir = (dir) => {
  const directoryContents = fs.readdirSync(dir).map((fileName) => {
    return path.join(dir, fileName);
  });
  const files = directoryContents.filter(isFile);
  const directories = directoryContents.filter(isDirectory);
  let subDirectoryContents = {};
  directories.forEach((directory) => {
    subDirectoryContents[directory] = findTranslationFilesInDir(directory);
  });
  let fileContents = {};
  files.forEach((file) => {
    const readedFile = fs.readFileSync(file, "utf-8");
    if (isJsonFile(file)) fileContents[file] = JSON.parse(readedFile);
  });

  const result = { ...subDirectoryContents, ...fileContents };
  return result;
};

const writeNamespaceFile = (targetDirectory, namespaceName, namespaceData) => {
  const namespaceFile = `${namespaceName}.json`;

  let oldContents = {};

  try {
    oldContents = JSON.parse(
      fs.readFileSync(targetDirectory + namespaceFile, "utf-8")
    );
  } catch (e) {
    // its ok for this to throw, maybe there isn't an existing namespace file.
    // we could check this beforehand. oops.
  }

  fs.writeFileSync(
    targetDirectory + namespaceFile,
    JSON.stringify({ ...namespaceData, ...oldContents }, undefined, 1)
  );
};

const deleteRedundantKeysFromMainTranslationFiles = (keysSet, directories) => {
  directories.forEach((directory) => {
    try {
      const oldContents = JSON.parse(
        fs.readFileSync(
          "." + systemSlashType + directory + "translation.json",
          "utf-8"
        )
      );
      const newContent = { ...oldContents };
      Array.from(keysSet).forEach((key) => {
        if (newContent[key]) {
          delete newContent[key];
        } else if (getProp(newContent, key)) {
          unsetProp(newContent, key);
        }
      });
      fs.writeFileSync(
        "." + systemSlashType + directory + "translation.json",
        JSON.stringify(newContent, undefined, 1)
      );
    } catch (e) {
      console.error(
        "en error occured while removing moved keys from translation.json"
      );
    }
  });
};

const findKeyInTranslationFiles = (targetKey, files) => {
  const foundIn = [];

  Object.keys(files).forEach((fileKey) => {
    if (isJsonFile(fileKey)) {
      const file = files[fileKey];
      if (file?.[targetKey] || getProp(file, targetKey)) {
        foundIn.push({
          foundWhere: fileKey,
          key: targetKey,
          value: file?.[targetKey] || getProp(file, targetKey),
        });
      } else {
      }
    } else {
      const subdirectoryFiles = files[fileKey];
      const foundInFile = findKeyInTranslationFiles(
        targetKey,
        subdirectoryFiles
      );
      foundIn.push(...foundInFile);
    }
  });

  return foundIn;
};

const mapTranslationCallsToList = (translationCalls) => {
  const translationCallsList = [];

  if (!translationCalls) return translationCallsList;

  Object.keys(translationCalls).forEach((key) => {
    if (isTargetedFile(key)) {
      const calls = translationCalls[key];
      translationCallsList.push({ foundWhere: key, calls });
    } else {
      const subDir = translationCalls[key];
      const results = mapTranslationCallsToList(subDir);
      translationCallsList.push(...results);
    }
  });

  return translationCallsList;
};

const getIsDuplicateKeyChecker = () => {
  const cache = {};
  return (key, namespace) => {
    if (cache[key]) {
      return cache[key];
    } else {
      cache[key] = cache[key] || [];
      cache[key].push(namespace);
      return false;
    }
  };
};
const isDuplicate = getIsDuplicateKeyChecker();

const findLocalesDirectories = (
  calls,
  existingTranslationFiles,
  directories
) => {
  calls?.length &&
    calls.forEach((translationCall) => {
      const keyOfTranslationCall = translationCall
        .match(translationKeyMatcher)[0]
        .slice(1, -1);
      const existingKeys = findKeyInTranslationFiles(
        keyOfTranslationCall,
        existingTranslationFiles
      );
      if (existingKeys?.length > 0) {
        existingKeys.forEach((existingKey) => {
          const fileName = getFileName(existingKey.foundWhere);
          const directory = existingKey.foundWhere.replace(fileName, "");
          directories.add(directory);
        });
      }
    });
};

const removeAllMarkedForDeletionKeys = (translationObject, parentObject) => {
  Object.keys(translationObject).forEach((key) => {
    if (translationObject[key]?.includes?.(markedForDeletion)) {
      delete translationObject[key];
    } else if (typeof translationObject[key] === "object") {
      removeAllMarkedForDeletionKeys(translationObject[key], translationObject);
      if (Object.keys(translationObject[key]).length === 0)
        delete translationObject[key];
    }
  });
};

const generateMetadata = ({
  scannedTranslationCalls,
  existingTranslationFiles,
}) => {
  const scannedTranslationCallsList = mapTranslationCallsToList(
    scannedTranslationCalls
  );
  const outputMap = {};
  const localesDirectories = new Set();
  const keysWithoutValueWarnings = [];
  const duplicateKeysWarnings = [];
  // try to determine locales directories by looking at existing translation files
  scannedTranslationCallsList.forEach(({ calls }) => {
    findLocalesDirectories(calls, existingTranslationFiles, localesDirectories);
  });

  // set namespaces and directories to empty dictionaries
  scannedTranslationCallsList.forEach(({ foundWhere }) => {
    const namespace = getNamespace(foundWhere);
    // save path of folders that are not under pages
    const srcNamespace = getSrcNamespace(foundWhere);
    const namespaceToSave = srcNamespace ? "common" : namespace;

    [...localesDirectories].forEach((directory) => {
      !outputMap[directory] && (outputMap[directory] = {});
      outputMap[directory][namespaceToSave] = {};
    });
  });

  scannedTranslationCallsList.forEach(({ calls, foundWhere }) => {
    const namespace = getNamespace(foundWhere);
    // save path of folders that are not under pages
    const srcNamespace = getSrcNamespace(foundWhere);
    const namespaceToSave = srcNamespace ? "common" : namespace;

    if (!calls) return;
    calls.forEach((translationCall) => {
      const keyOfTranslationCall = translationCall
        .match(translationKeyMatcher)[0]
        .slice(1, -1);
      const existingKeys = findKeyInTranslationFiles(
        keyOfTranslationCall,
        existingTranslationFiles
      );

      if (existingKeys?.length > 0) {
        existingKeys.forEach((existingKey) => {
          const fileName = getFileName(existingKey.foundWhere);
          const directory = existingKey.foundWhere.replace(fileName, "");
          const duplicateKey = isDuplicate(existingKey.key, namespaceToSave);
          const duplicateNamespace = duplicateKey?.[0];
          if (!duplicateKey?.length || duplicateNamespace === namespaceToSave) {
            outputMap[directory][namespaceToSave][existingKey.key] =
              existingKey.value;
          } else {
            duplicateKeysWarnings.push({ existingKey });
            if (!outputMap[directory].common) outputMap[directory].common = {};
            outputMap[directory]["common"][existingKey.key] = existingKey.value;
            const key = existingKey.key;
            [...localesDirectories].forEach((directory) => {
              if (duplicateNamespace === "common") return;
              outputMap[directory][duplicateNamespace][key] =
                outputMap[directory][duplicateNamespace][key] +
                markedForDeletion;
            });
          }
        });
      } else {
        keysWithoutValueWarnings.push(keyOfTranslationCall);
      }
    });
  });

  console.warn(
    "Detected keys without defined values! ->",
    keysWithoutValueWarnings
  );
  console.warn(
    "Detected duplicate keys, inserted them to common.json. Check their values though, the value inserted into common is the first value found. ->",
    duplicateKeysWarnings
  );
  removeAllMarkedForDeletionKeys(outputMap);
  return { outputMap, localesDirectories };
};

const updateTranslationCallsToNewNamespace = (folderPath, namespace) => {
  const directoryContents = fs.readdirSync(folderPath).map((fileName) => {
    return path.join(folderPath, fileName);
  });
  const files = directoryContents.filter(isFile);
  const directories = directoryContents.filter(isDirectory);

  directories.forEach((directory) => {
    updateTranslationCallsToNewNamespace(directory, namespace);
  });
  files.forEach((file) => {
    const readedFile = fs.readFileSync(file, "utf-8");
    let modifiedFile;
    if (isTargetedFile(file)) {
      // @ts-ignore
      modifiedFile = readedFile.replaceAll(
        /useTranslation\(/g,
        `useTranslation("${namespace}"`
      );
    }

    fs.writeFileSync(file, modifiedFile ?? readedFile);
  });
};

const updatePagesTranslationCalls = (index, namespace) => {
  // has to be only run once
  if (index !== 0) return;

  const pagesUrl = dirToScanKeysIn + systemSlashType + "pages";
  namespace !== "common" &&
    updateTranslationCallsToNewNamespace(
      `${pagesUrl}${systemSlashType}${namespace}`,
      namespace
    );
};

const run = (dirToScanKeysIn, localesDir) => {
  const scannedTranslationCalls = findTranslationCallsIn(dirToScanKeysIn);
  const existingTranslationFiles = findTranslationFilesInDir(localesDir);
  // generates the metadata that we use to generate new translation files
  const { outputMap, localesDirectories } = generateMetadata({
    scannedTranslationCalls,
    existingTranslationFiles,
  });

  const keysMarkedForDeletion = new Set();

  Object.entries(outputMap).forEach(([directory, namespaces], index) => {
    Object.entries(namespaces).forEach(([namespace, namespaceData]) => {
      // updates translation calls under pages
      updatePagesTranslationCalls(index, namespace);

      writeNamespaceFile(
        "." + systemSlashType + directory,
        namespace,
        namespaceData
      );
      Object.entries(namespaceData).forEach(([key]) => {
        keysMarkedForDeletion.add(key);
      });
    });
  });

  // removes now redundant keys from translation.json files.
  deleteRedundantKeysFromMainTranslationFiles(
    keysMarkedForDeletion,
    localesDirectories
  );
};

// Test run
const localesDir = ".\\public\\locales";
const dirToScanKeysIn = ".\\src";
run(dirToScanKeysIn, localesDir);
