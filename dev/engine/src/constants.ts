let activeCache = "alpha";

module.exports = function setActiveCache(cache: string) {
  activeCache = cache;
};
module.exports = function getActiveCache() {
  return activeCache;
};
