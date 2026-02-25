import { Routes, Route, BrowserRouter } from "react-router-dom";
import { Categories } from "./Categories";
import { CategoryPage } from "./CategoryPage";
import { MySolutions } from "./MySolutions";

export const SolutionsCatalog = () => {
  const sampleSolutions = [
    {
      id: 1,
      title: "Sample Solution 1",
      company: "Company A",
      description: "Description for solution 1...",
    },
    {
      id: 2,
      title: "Sample Solution 2",
      company: "Company B",
      description: "Description for solution 2...",
    },
  ];

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Categories />} />
        <Route path="/solutions" element={<Categories />} />
        <Route
          path="/solutions/all"
          element={
            <CategoryPage
              categoryName="Все решения"
              solutions={sampleSolutions}
            />
          }
        />
        <Route
          path="/solutions/popular"
          element={
            <CategoryPage
              categoryName="Популярное"
              solutions={sampleSolutions}
            />
          }
        />
        <Route
          path="/solutions/belarus"
          element={
            <CategoryPage
              categoryName="Для Беларуси"
              solutions={sampleSolutions}
            />
          }
        />
        <Route
          path="/solutions/kazakhstan"
          element={
            <CategoryPage
              categoryName="Для Казахстана"
              solutions={sampleSolutions}
            />
          }
        />
        <Route path="/solutions/uzbekistan" element={<Categories />} />
        <Route
          path="/solutions/new"
          element={
            <CategoryPage categoryName="Новые" solutions={sampleSolutions} />
          }
        />
        <Route
          path="/solutions/cms"
          element={
            <CategoryPage
              categoryName="CMS, конструкторы сайтов и соцсети"
              solutions={sampleSolutions}
            />
          }
        />
        <Route
          path="/solutions/crm"
          element={
            <CategoryPage categoryName="CRM" solutions={sampleSolutions} />
          }
        />
        <Route
          path="/solutions/messaging"
          element={
            <CategoryPage
              categoryName="Email, SMS, мессенджеры"
              solutions={sampleSolutions}
            />
          }
        />
        <Route
          path="/solutions/automation"
          element={
            <CategoryPage
              categoryName="Автоматизация"
              solutions={sampleSolutions}
            />
          }
        />
        <Route
          path="/solutions/analytics"
          element={
            <CategoryPage
              categoryName="Аналитика"
              solutions={sampleSolutions}
            />
          }
        />
        <Route
          path="/solutions/banks"
          element={
            <CategoryPage categoryName="Банки" solutions={sampleSolutions} />
          }
        />
        <Route
          path="/solutions/accounting"
          element={
            <CategoryPage
              categoryName="Бухгалтерия"
              solutions={sampleSolutions}
            />
          }
        />
        <Route
          path="/solutions/delivery"
          element={
            <CategoryPage categoryName="Доставка" solutions={sampleSolutions} />
          }
        />
        <Route
          path="/solutions/other"
          element={
            <CategoryPage categoryName="Другое" solutions={sampleSolutions} />
          }
        />
        <Route
          path="/solutions/orders"
          element={
            <CategoryPage
              categoryName="Заказы, счета и отгрузки"
              solutions={sampleSolutions}
            />
          }
        />
        <Route
          path="/solutions/contractors"
          element={
            <CategoryPage
              categoryName="Контрагенты"
              solutions={sampleSolutions}
            />
          }
        />
        <Route
          path="/solutions/marketplaces"
          element={
            <CategoryPage
              categoryName="Маркетплейсы"
              solutions={sampleSolutions}
            />
          }
        />
        <Route
          path="/solutions/mobile"
          element={
            <CategoryPage
              categoryName="Мобильные приложения"
              solutions={sampleSolutions}
            />
          }
        />
        <Route
          path="/solutions/online-cash"
          element={
            <CategoryPage
              categoryName="Онлайн-кассы"
              solutions={sampleSolutions}
            />
          }
        />
        <Route
          path="/solutions/qr-payment"
          element={
            <CategoryPage
              categoryName="Оплата по QR-коду в рознице"
              solutions={sampleSolutions}
            />
          }
        />
        <Route
          path="/solutions/payment"
          element={
            <CategoryPage
              categoryName="Платежные системы"
              solutions={sampleSolutions}
            />
          }
        />
        <Route
          path="/solutions/loyalty"
          element={
            <CategoryPage
              categoryName="Программы лояльности"
              solutions={sampleSolutions}
            />
          }
        />
        <Route path="/my-solutions" element={<MySolutions />} />
      </Routes>
    </BrowserRouter>
  );
};
