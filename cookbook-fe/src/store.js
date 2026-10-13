// Единый стор состояния приложения.
// Хранит все данные, знает про загрузку и ошибки, общается с API
// и уведомляет подписчиков (UI-модули) об изменениях.

import {
    getRecipes,
    getRecipe,
    getRecentlyViewed,
    setFavorite,
    markViewed,
} from "./api.js";

// Начальное состояние.
const initialState = {
    recipes: [],            // список рецептов (карточки, с isFavorite)
    recentlyViewed: [],     // недавно просмотренные
    currentRecipe: null,    // детали открытого рецепта
    search: "",             // строка поиска
    category: "",           // выбранная категория ("" = все)
    isLoadingList: false,   // загрузка списка/главной
    isLoadingRecipe: false, // загрузка деталей рецепта
    error: null,            // текст последней ошибки загрузки
    currentView: "home",    // "home" | "recipe"
};

// Текущее состояние (приватное, снаружи доступно только через getState()).
let state = { ...initialState };

// Список подписчиков (функций, которых надо вызывать при изменениях).
const listeners = new Set();

// Уведомить всех подписчиков текущим состоянием.
function notify() {
    for (const listener of listeners) {
        listener(state);
    }
}

// Обновить часть состояния и уведомить подписчиков.
// Если новое значение поля совпадает со старым — не трогаем (мелкая оптимизация).
function setState(partial) {
    let changed = false;
    for (const key of Object.keys(partial)) {
        if (state[key] !== partial[key]) {
            changed = true;
            break;
        }
    }
    if (!changed) return;

    state = { ...state, ...partial };
    notify();
}

// --- Публичный интерфейс ---

// Подписка на изменения. Возвращает функцию отписки.
export function subscribe(listener) {
    listeners.add(listener);
    // Сразу отдаём текущее состояние, чтобы подписчик отрисовал актуальный UI.
    listener(state);
    return () => listeners.delete(listener);
}

// Снимок состояния (для чтения). Мутировать нельзя.
export function getState() {
    return state;
}

// --- Загрузка данных ---

// Загрузить список рецептов (GET /recipes).
export async function loadRecipes() {
    setState({ isLoadingList: true, error: null });
    try {
        const recipes = await getRecipes();
        setState({ recipes, isLoadingList: false });
    } catch (err) {
        setState({ isLoadingList: false, error: err.message });
    }
}

// Загрузить недавно просмотренные (GET /recipes/recently-viewed).
// Ошибку здесь не выводим глобально — блок просто останется пустым.
export async function loadRecentlyViewed() {
    try {
        const recentlyViewed = await getRecentlyViewed();
        setState({ recentlyViewed });
    } catch (err) {
        // Тихая ошибка: для второстепенного блока не критично.
        // Полезно для отладки — но не блокирует UI.
        console.warn("Failed to load recently viewed:", err.message);
    }
}

// Открыть экран рецепта: переключить view, загрузить детали,
// отметить просмотр и обновить recentlyViewed.
export async function openRecipe(id) {
    setState({
        currentView: "recipe",
        currentRecipe: null,
        isLoadingRecipe: true,
        error: null,
    });

    try {
        const recipe = await getRecipe(id);
        setState({ currentRecipe: recipe, isLoadingRecipe: false });

        // Fire-and-forget: отметка просмотра не должна блокировать рендер.
        // После успеха — обновим блок Recently Viewed.
        markViewed(id)
            .then(loadRecentlyViewed)
            .catch((err) => console.warn("Failed to mark viewed:", err.message));
    } catch (err) {
        setState({ isLoadingRecipe: false, error: err.message });
    }
}

// Вернуться на главную.
// Recently Viewed обновим здесь — потому что при возврате он мог измениться
// (пользователь только что открыл рецепт).
export function closeRecipe() {
    setState({ currentView: "home", currentRecipe: null, error: null });
    loadRecentlyViewed();
}

// --- Фильтры ---

export function setSearch(value) {
    setState({ search: value });
}

export function setCategory(value) {
    setState({ category: value });
}

// --- Действия с избранным ---

// Переключить избранное у рецепта.
// Оптимистично: сначала меняем состояние локально, потом шлём PATCH.
// При ошибке — откатываем и бросаем исключение, чтобы UI показал alert.
export async function toggleFavorite(id) {
    const prevRecipes = state.recipes;
    const prevRecent = state.recentlyViewed;

    // Находим рецепт в обоих списках.
    const recipeInList = prevRecipes.find((r) => r.id === id);
    const recipeInRecent = prevRecent.find((r) => r.id === id);
    if (!recipeInList) return;

    const newValue = !recipeInList.isFavorite;

    // Оптимистичное обновление.
    setState({
        recipes: prevRecipes.map((r) =>
            r.id === id ? { ...r, isFavorite: newValue } : r
        ),
        recentlyViewed: recipeInRecent
            ? prevRecent.map((r) =>
                r.id === id ? { ...r, isFavorite: newValue } : r
            )
            : prevRecent,
    });

    try {
        const updated = await setFavorite(id, newValue);
        // Синхронизируемся с ответом сервера: подменяем карточку на ту,
        // что вернул backend (на случай, если он нормализовал что-то ещё).
        setState({
            recipes: state.recipes.map((r) => (r.id === id ? { ...r, ...updated } : r)),
        });
    } catch (err) {
        // Откат оптимистичного апдейта.
        setState({ recipes: prevRecipes, recentlyViewed: prevRecent });
        // Пробрасываем ошибку наверх — UI покажет alert.
        throw err;
    }
}

// --- Обработка ошибок ---

// Повторить загрузку после ошибки.
// Смотрим, какой экран активен, и грузим соответствующие данные.
export function retry() {
    setState({ error: null });
    if (state.currentView === "recipe" && state.currentRecipe === null) {
        // Значит, падали на загрузке деталей, но id мы не сохранили отдельно.
        // Простейший вариант — вернуться на главную.
        closeRecipe();
        loadRecipes();
    } else {
        loadRecipes();
        loadRecentlyViewed();
    }
}