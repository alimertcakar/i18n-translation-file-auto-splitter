const fs = require("fs");
const path = require("path");

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
  const result = { ...subDirectoryContents, ...fileContents };
  return result;
};

const writeNamespaceFile = (namespaceName, namespaceData) => {
  const namespaceFile = `./${namespaceName}.json`;
  fs.writeFileSync(namespaceFile, JSON.stringify(namespaceData, undefined, 1));
};

const generateNameSpaceFiles = (
  scannedTranslationKeys,
  existingTranslationFiles
) => {
  console.log(scannedTranslationKeys);
  console.log(existingTranslationFiles);
  // TODO load existing jsons under localesDir
};

const run = (dirToScanKeysIn, localesDir) => {
  const scannedTranslationKeys = findTranslationCallsIn("./src/pages");
  const existingTranslationFiles =
    findTranslationFilesInDir("./public/locales/");
  generateNameSpaceFiles(scannedTranslationKeys, existingTranslationFiles);
};

// Test run
const localesDir = "./public/locales";
const dirToScanKeysIn = "./src/pages";
run(dirToScanKeysIn, localesDir);
