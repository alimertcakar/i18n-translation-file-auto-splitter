import React from "react";

const Testfile = () => {
  const { t } = useTranslation();
  return (
    <div>
      Testfile
      {t("translationKeyOne")}
      {t("translationKeyTwo")}
      {t("common_mismatch")}
    </div>
  );
};

export default Testfile;
