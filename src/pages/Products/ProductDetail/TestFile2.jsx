import React from "react";

const Testfile = () => {
  const useTranslation = useTranslation();
  return (
    <div>
      Testfile
      {t("name")}
      {t("translationKeyFourth")}
    </div>
  );
};

export default Testfile;
