import React from "react";

const Testfile = () => {
  const useTranslation = useTranslation();
  return (
    <div>
      Testfile
      {t("name")}
      {t("surname")}
    </div>
  );
};

export default Testfile;
