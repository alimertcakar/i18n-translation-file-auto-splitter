import React from "react";

const Testfile = () => {
  const useTranslation = useTranslation("common");
  return (
    <div>
      Testfile
      {t("translationKeyOne")}
      {t("translationKeyTwo")}
    </div>
  );
};

export default Testfile;
