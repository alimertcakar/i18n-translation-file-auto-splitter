const fs = require("fs");
const path = require("path");

const isFile = (fileName) => {
  return fs.lstatSync(fileName).isFile();
};
const isDirectory = (fileName) => {
  return fs.lstatSync(fileName).isDirectory();
};

const findTranslationKeysInDirectory = (folderPath) => {
  const directoryContents = fs.readdirSync(folderPath).map((fileName) => {
    return path.join(folderPath, fileName);
  });
  const files = directoryContents.filter(isFile);
  const directories = directoryContents.filter(isDirectory);
  const directoryTranslations = directories.map(findTranslationKeysInDirectory);
  const fileTranslations = files.map((file) => {
    const fileContents = fs.readFileSync(file, "utf-8");
    const fileTranslations = JSON.parse(fileContents);
    return fileTranslations;
  });

  return { ...directoryTranslations };
};

const writeNamespaceFile = (namespaceName, namespaceData) => {
  const namespaceFile = `./${namespaceName}.json`;
  fs.writeFileSync(namespaceFile, JSON.stringify(namespaceData, undefined, 1));
};
