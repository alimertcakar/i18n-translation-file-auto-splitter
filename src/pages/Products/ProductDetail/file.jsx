import React from "react";

const Testfile = () => {
  const useTranslation = useTranslation("common");
  return (
    <div>
      Testfile
      {t("name")}
      {t("key_unique_to_products_name_space")}
      {t("parametrized_key", { count: 5 })}
    </div>
  );
};

export default Testfile;
