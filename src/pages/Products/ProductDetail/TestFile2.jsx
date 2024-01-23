import React from "react";

const Testfile = () => {
  const useTranslation = useTranslation("common");
  return (
    <div>
      Testfile
      {t("translationKeyThird")}
      {t("translationKeyFourth")}
    </div>
  );
};

export default Testfile;
