
export default function CatalogPreview({ formData, images }) {
  const langs = [
    { code: "uz", label: "O'zbekcha", name: formData.productName, short: formData.shortDescription, desc: formData.description, metaTitle: formData.metaTitle, metaDesc: formData.metaDescription },
    { code: "ru", label: "Русский", name: formData.productName_ru, short: formData.shortDescription_ru, desc: formData.description_ru, metaTitle: formData.metaTitle_ru, metaDesc: formData.metaDescription_ru },
    { code: "en", label: "Inglizcha", name: formData.productName_en, short: formData.shortDescription_en, desc: formData.description_en, metaTitle: formData.metaTitle_en, metaDesc: formData.metaDescription_en },
  ];

  return (
    <div className="bg-gradient-to-br from-white to-gray-50 p-6 border border-gray-200  shadow-lg">
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-green-100 p-2 rounded-lg">
          <span className="text-2xl">📦</span>
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-800">Katalog ko'rinishi</h2>
          <p className="text-sm text-gray-500">Mahsulotingiz katalogda qanday ko'rinishini ko'rsatadi</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
        {langs.map((lang) => (
          <div key={lang.code} className="bg-white border border-gray-200  p-4 shadow-sm hover:shadow-md transition-shadow duration-300">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800">{lang.label}</h3>
              <span className="bg-green-50 text-green-700 px-3 py-1 rounded-full text-xs font-medium">
                {lang.code.toUpperCase()}
              </span>
            </div>

            {images.length > 0 && (
              <div className="mb-4 rounded-lg overflow-hidden shadow-sm">
                <img
                  src={URL.createObjectURL(images[0].file)}
                  alt="Mahsulot ko'rinishi"
                  className="w-full h-48 object-cover hover:scale-105 transition-transform duration-300"
                />
              </div>
            )}

            <div className="space-y-3">
              <div>
                <h4 className="font-semibold text-gray-800 text-lg leading-tight">
                  {lang.name || "Mahsulot nomi..."}
                </h4>
              </div>

              {/* Short Description */}
              <div>
                <p className="text-gray-600 text-sm leading-relaxed">
                  {lang.short || "Qisqa tavsif..."}
                </p>
              </div>

              {/* Full Description */}
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xs text-gray-700 leading-relaxed">
                  {lang.desc || "Mahsulot tavsifi..."}
                </p>
              </div>

              {/* Meta Information */}
              <div className="border-t border-gray-100 pt-3 space-y-2">
                <div className="bg-green-50 p-3 rounded-md">
                  <p className="text-xs font-medium text-green-800 mb-1">Meta sarlavha:</p>
                  <p className="text-xs text-green-700 leading-relaxed">
                    {lang.metaTitle || "Meta title kiritilmagan"}
                  </p>
                </div>
                
                <div className="bg-green-50 p-3 rounded-md">
                  <p className="text-xs font-medium text-green-800 mb-1">Meta tavsif:</p>
                  <p className="text-xs text-green-700 leading-relaxed">
                    {lang.metaDesc || "Meta description kiritilmagan"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Info */}
      <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <span className="text-yellow-600 text-xl">💡</span>
          <div>
            <h4 className="font-medium text-yellow-800 mb-1">Ko'rinish ma'lumoti</h4>
            <p className="text-sm text-yellow-700">
              Bu preview sizning mahsulotingiz catalog da turli tillarda qanday ko'rinishini ko'rsatadi. 
              Haqiqiy catalog da narx, rating va boshqa ma'lumotlar ham ko'rsatiladi.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
