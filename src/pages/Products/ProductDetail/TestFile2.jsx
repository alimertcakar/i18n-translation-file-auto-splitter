import React from "react";

const Testfile = () => {
  const useTranslation = useTranslation("common");
  return (
    <div>
      Testfile
      {t("name")}
      {t("translationKeyFourth")}
    </div>
  );
};

export default Testfile;
