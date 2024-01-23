import React from "react";

const Testfile = () => {
  const useTranslation = useTranslation("common");
  return (
    <div>
      Testfile
      {t("translationKeyOne")}
      {t("translationKeyTwo")}
      {t("commonkey")}
      {t("nested.key")}
    </div>
  );
};

export default Testfile;
