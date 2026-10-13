// Точка входа приложения.
// Связывает стор и UI-модули, подписывается на изменения,
// обрабатывает глобальные события и запускает первичную загрузку.

import {
    subscribe,
    getState,
    loadRecipes,
    loadRecentlyViewed,
    openRecipe,
    closeRecipe,
    toggleFavorite,
    setSearch,
    setCategory,
    retry,
} from "./store.js";

import { initHome, renderHome } from "./ui/home.js";
import { initRecipe, renderRecipe } from "./ui/recipe.js";

// --- Ссылки на DOM ---

const views = {
    home: document.getElementById("home-view"),
    recipe: document.getElementById("recipe-view"),
};

const globalLoader = document.getElementById("global-loader");
const globalError = document.getElementById("global-error");
const retryBtn = document.getElementById("retry-btn");
const backBtn = document.getElementById("back-btn");
const logoBtn = document.getElementById("logo-btn");

// --- Обработчик мутации избранного с alert при ошибке ---

// Вызывается из UI-модулей при клике по сердечку.
// Стор делает оптимистичное обновление; если запрос упал,
// toggleFavorite бросает исключение — ловим и показываем alert.
async function handleToggleFavorite(recipe) {
    try {
        await toggleFavorite(recipe.id);
    } catch (err) {
        alert(`Failed to update favorite: ${err.message}`);
    }
}

// --- Колбэки, которые получают UI-модули ---

const appActions = {
    onOpen: (recipe) => {
        openRecipe(recipe.id);
    },
    onToggleFavorite: handleToggleFavorite,
    onSearch: (value) => {
        setSearch(value);
    },
    onCategory: (value) => {
        setCategory(value);
    },
    onRetry: () => {
        retry();
    },
};

// --- Инициализация UI-модулей ---

initHome(appActions);
initRecipe(appActions);

// --- Глобальные обработчики ---

retryBtn.addEventListener("click", () => {
    retry();
});

backBtn.addEventListener("click", () => {
    closeRecipe();
});

// Клик по логотипу — возврат на главную.
// Работает и с клавиатуры (Enter/Space), т.к. в разметке стоит role="button".
logoBtn.addEventListener("click", () => {
    if (getState().currentView !== "home") {
        closeRecipe();
    }
});

logoBtn.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        logoBtn.click();
    }
});

// --- Подписка на стор ---

subscribe((state) => {
    render(state);
});

// --- Рендер всего приложения по снимку состояния ---

function render(state) {
    // Переключение экранов.
    const isHome = state.currentView === "home";
    views.home.classList.toggle("hidden", !isHome);
    views.recipe.classList.toggle("hidden", isHome);

    // Глобальный лоадер — только на первой загрузке главной,
    // когда список ещё пуст и данных нет.
    const showLoader = state.isLoadingList && state.recipes.length === 0;
    globalLoader.classList.toggle("hidden", !showLoader);

    // Глобальная ошибка — для главной.
    // Ошибки деталей рецепта показываются внутри #recipe-detail.
    const showGlobalError = Boolean(state.error) && state.currentView === "home";
    globalError.classList.toggle("hidden", !showGlobalError);

    // Сам контент главной прячем при глобальной ошибке.
    views.home.classList.toggle("hidden", !isHome || showGlobalError);

    // Рендер экранов.
    // Главную рендерим всегда — на случай быстрого переключения,
    // данные уже в сторе, это дёшево.
    renderHome(state);

    if (state.currentView === "recipe") {
        renderRecipe(state);
    }
}

// --- Первичная загрузка ---

loadRecipes();
loadRecentlyViewed();