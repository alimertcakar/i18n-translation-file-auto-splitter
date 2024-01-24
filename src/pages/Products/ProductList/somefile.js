import React from "react";

const Testfile = () => {
  const { t } = useTranslation();
  return <div>{t("key_unique_to_products_name_space")}</div>;
};

export default Testfile;
