// Рендер и обработка главного экрана:
// поиск, фильтр категорий, три блока карточек, пустые состояния.

import { createRecipeCard } from "./card.js";
import { SEARCH_DEBOUNCE_MS } from "../config.js";

// Ссылки на DOM-узлы, которые нужны модулю.
// Забираем их один раз при вызове renderHome, чтобы не искать
// по документу на каждый рендер.
let els = null;

// Текущий таймер дебаунса поиска (один на всё приложение).
let searchDebounceTimer = null;

// Действия (колбэки), которые передаёт main.js.
let actions = null;

// Инициализация модуля: сохраняем DOM-узлы и навешиваем обработчики.
// Вызывается один раз из main.js.
export function initHome(appActions) {
    actions = appActions;

    els = {
        searchInput: document.getElementById("search-input"),
        categoryFilter: document.getElementById("category-filter"),
        favoritesGrid: document.getElementById("favorites-grid"),
        recentGrid: document.getElementById("recent-grid"),
        recipesGrid: document.getElementById("recipes-grid"),
        favoritesEmpty: document.getElementById("favorites-empty"),
        recentEmpty: document.getElementById("recent-empty"),
        recipesEmpty: document.getElementById("recipes-empty"),
    };

    // Поиск с дебаунсом: пользователь печатает — ждём паузу 300 мс,
    // только потом обновляем состояние.
    els.searchInput.addEventListener("input", (event) => {
        const value = event.target.value;
        if (searchDebounceTimer) {
            clearTimeout(searchDebounceTimer);
        }
        searchDebounceTimer = setTimeout(() => {
            actions.onSearch(value);
        }, SEARCH_DEBOUNCE_MS);
    });

    // Фильтр категории — обновление сразу, без дебаунса.
    els.categoryFilter.addEventListener("change", (event) => {
        actions.onCategory(event.target.value);
    });
}

// Главная функция рендера. Вызывается подписчиком стора
// при каждом изменении состояния.
export function renderHome(state) {
    if (!els) return;

    // Синхронизируем поля ввода со стором — на случай, если значение
    // изменилось не через UI (например, после reset).
    if (els.searchInput.value !== state.search) {
        els.searchInput.value = state.search;
    }

    renderCategoryOptions(state);

    // Список всех рецептов с учётом поиска и фильтра.
    const visibleRecipes = filterRecipes(state.recipes, state.search, state.category);

    // Избранные — из полного списка (поиск/фильтр на них не действуют).
    const favorites = state.recipes.filter((r) => r.isFavorite);

    renderGrid(els.recipesGrid, visibleRecipes, {
        showFavorite: true,
        onOpen: actions.onOpen,
        onToggleFavorite: actions.onToggleFavorite,
    });
    renderGrid(els.favoritesGrid, favorites, {
        showFavorite: true,
        onOpen: actions.onOpen,
        onToggleFavorite: actions.onToggleFavorite,
    });
    renderGrid(els.recentGrid, state.recentlyViewed, {
        // В Recently Viewed backend не отдаёт isFavorite,
        // поэтому сердечко там не рисуем.
        showFavorite: false,
        onOpen: actions.onOpen,
        onToggleFavorite: actions.onToggleFavorite,
    });

    toggleEmpty(els.recipesEmpty, visibleRecipes.length === 0);
    toggleEmpty(els.favoritesEmpty, favorites.length === 0);
    toggleEmpty(els.recentEmpty, state.recentlyViewed.length === 0);
}

// --- Вспомогательные функции ---

// Наполнить селект категорий уникальными значениями из списка рецептов.
// Один раз построенный набор не пересобираем при каждом рендере зря.
let lastCategoriesKey = "";
function renderCategoryOptions(state) {
    const categories = [...new Set(state.recipes.map((r) => r.category))].sort();
    const key = categories.join("|");
    if (key === lastCategoriesKey) return; // ничего не поменялось
    lastCategoriesKey = key;

    const select = els.categoryFilter;
    const current = state.category;

    // Сохраняем «Все категории» как первый option.
    select.innerHTML = "";
    const allOption = document.createElement("option");
    allOption.value = "";
    allOption.textContent = "All categories";
    select.appendChild(allOption);

    for (const category of categories) {
        const option = document.createElement("option");
        option.value = category;
        option.textContent = category;
        select.appendChild(option);
    }

    // Восстанавливаем выбранное значение (если ещё существует).
    select.value = categories.includes(current) ? current : "";
}

// Отрисовать сетку карточек: очищаем и наполняем заново.
// Простой и предсказуемый подход — 20 карточек, перерисовка дешёвая.
function renderGrid(gridEl, recipes, options) {
    gridEl.innerHTML = "";
    for (const recipe of recipes) {
        const card = createRecipeCard(recipe, options);
        gridEl.appendChild(card);
    }
}

// Показать/скрыть плейсхолдер пустого состояния.
function toggleEmpty(el, isEmpty) {
    el.classList.toggle("hidden", !isEmpty);
}

// Фильтрация по поисковой строке и категории.
// Поиск — по подстроке в title, регистронезависимо.
export function filterRecipes(recipes, search, category) {
    const query = search.trim().toLowerCase();
    return recipes.filter((recipe) => {
        const matchesSearch = query === "" || recipe.title.toLowerCase().includes(query);
        const matchesCategory = category === "" || recipe.category === category;
        return matchesSearch && matchesCategory;
    });
}