const fs = require("fs");
const path = require("path");

const markedForDeletion = "[[MARKED_FOR_DELETION]]";
// 'src/pages/Users/UserDetail/UserDetail.jsx' -> Users
const getNamespace = (path) => {
  const parts = path.includes("\\") ? path.split("\\") : path.split("/");
  return parts[parts.indexOf("pages") + 1];
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

const defaultTranslationMatcher = /\b(?<![A-Z])t\(["'].*["']\)/g;

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
    if (isTargetedFile(file))
      fileContents[file] = readedFile.match(translationMatcher);
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

  // todo remove duplicates before saving?
  const result = { ...subDirectoryContents, ...fileContents };
  return result;
};

const writeNamespaceFile = (targetDirectory, namespaceName, namespaceData) => {
  const namespaceFile = `${namespaceName}.json`;

  let oldContents = {};

  try {
    oldContents = fs.readFileSync(targetDirectory + namespaceFile, "utf-8");
  } catch (e) {}

  fs.writeFileSync(
    targetDirectory + namespaceFile,
    JSON.stringify({ ...namespaceData, ...oldContents }, undefined, 1)
  );
};

const findKeyInTranslationFiles = (targetKey, files) => {
  const foundIn = [];

  Object.keys(files).forEach((fileKey) => {
    if (isJsonFile(fileKey)) {
      const file = files[fileKey];
      if (file[targetKey]) {
        foundIn.push({
          foundWhere: fileKey,
          key: targetKey,
          value: file[targetKey],
        });
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
  return (key, meta) => {
    if (cache[key]) {
      return cache[key];
    } else {
      cache[key] = meta;
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
  calls.forEach((translationCall) => {
    const keyOfTranslationCall = translationCall
      .match(/["'].*["']/g)[0]
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
    const namespace = getNamespace(foundWhere).toLowerCase();
    [...localesDirectories].forEach((directory) => {
      !outputMap[directory] && (outputMap[directory] = {});
      outputMap[directory][namespace] = {};
    });
  });

  scannedTranslationCallsList.forEach(({ calls, foundWhere }) => {
    const namespace = getNamespace(foundWhere).toLowerCase();
    calls.forEach((translationCall) => {
      const keyOfTranslationCall = translationCall
        .match(/["'].*["']/g)[0]
        .slice(1, -1);
      const existingKeys = findKeyInTranslationFiles(
        keyOfTranslationCall,
        existingTranslationFiles
      );

      if (existingKeys?.length > 0) {
        existingKeys.forEach((existingKey) => {
          const fileName = getFileName(existingKey.foundWhere);
          const directory = existingKey.foundWhere.replace(fileName, "");
          const duplicateKey = isDuplicate(directory + existingKey.key, [
            directory,
            namespace,
          ]);
          if (!duplicateKey?.length) {
            outputMap[directory][namespace][existingKey.key] =
              existingKey.value;
          } else {
            duplicateKeysWarnings.push({ existingKey });
            if (!outputMap[directory].common) outputMap[directory].common = {};
            outputMap[directory]["common"][existingKey.key] = existingKey.value;
            const key = existingKey.key;
            const duplicateDirectory = duplicateKey?.[0];
            const duplicateNamespace = duplicateKey?.[1];
            outputMap[duplicateDirectory][duplicateNamespace][key] =
              outputMap[duplicateDirectory][duplicateNamespace][key] +
              markedForDeletion;
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
    "Detected duplicate keys, insertem them to common.json. Check their values though, the value inserted into common is the first value found. ->",
    duplicateKeysWarnings
  );
  removeAllMarkedForDeletionKeys(outputMap);
  return outputMap;
};

const run = (dirToScanKeysIn, localesDir) => {
  const scannedTranslationCalls = findTranslationCallsIn(dirToScanKeysIn);
  const existingTranslationFiles = findTranslationFilesInDir(localesDir);
  // generates the metadata that we use to generate new translation files
  const outputMap = generateMetadata({
    scannedTranslationCalls,
    existingTranslationFiles,
  });

  // todo handle common.conflicted.key
  // todo preserve older values in files
  Object.entries(outputMap).forEach(([directory, namespaces]) => {
    Object.entries(namespaces).forEach(([namespace, namespaceData]) => {
      writeNamespaceFile(".\\" + directory, namespace, namespaceData);
    });
  });
};

// Test run
const localesDir = "./public/locales";
const dirToScanKeysIn = "./src/pages";
run(dirToScanKeysIn, localesDir);
