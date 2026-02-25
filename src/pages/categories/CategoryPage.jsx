
export const CategoryPage = ({ categoryName, solutions }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          {categoryName}
        </h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {solutions.map((solution) => (
            <div
              key={solution.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {solution.title}
              </h3>
              <p className="text-sm text-gray-600 mb-4">{solution.company}</p>
              <p className="text-sm text-gray-700">{solution.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
