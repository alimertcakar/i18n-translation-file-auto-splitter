import React from "react";

const Testfile = () => {
  const useTranslation = useTranslation("common");
  return (
    <div>
      Testfile
      {t("name")}
      {t("surname")}
    </div>
  );
};

export default Testfile;
