import $api from "./api";

const productsApi = {
  create: (payload, config = {}) => $api.post("/products/create", payload, config),
  update: (productId, payload, config = {}) =>
    $api.patch(`/products/update/${productId}`, payload, config),
  remove: (productId) => $api.delete(`/products/delete/${productId}`),

  listAll: (params = {}) => $api.get("/products/lists/all", { params }),
  getArchives: (params = {}) => $api.get("/products/get/archives", { params }),
  getDeleted: (params = {}) =>
    $api.get("/products/get/deleted/data", { params }),
  getById: (productId) => $api.get(`/products/get/by/${productId}`),
  getVariantById: (variantId) =>
    $api.get(`/products/get/variant/by/${variantId}`),

  searchByQuery: (params = {}) => $api.get("/products/get/query", { params }),
  getPopular: (params = {}) => $api.get("/products/get/popular", { params }),
  getDiscounted: (params = {}) =>
    $api.get("/products/get/discounted", { params }),
  getBestSellers: (params = {}) =>
    $api.get("/products/best/sellers", { params }),
  getPublicAll: (params = {}) => $api.get("/products/all", { params }),
  getByVariantIds: (payload = {}) => $api.post("/products/variant/ids", payload),
};

export default productsApi;
