(function() {
  const customFonts = %FONTS_LIST%;
  
  const originalQuery = document.fonts.check.bind(document.fonts);
  document.fonts.check = function(font) {
    const fontFamily = font.match(/['"]?([^'"]+)['"]?/)?.[1];
    if (fontFamily && customFonts.includes(fontFamily)) {
      return true;
    }
    return customFonts.some(f => font.includes(f));
  };
})();
