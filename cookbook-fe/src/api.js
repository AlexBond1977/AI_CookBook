// Слой работы с backend API.
// Здесь собраны все HTTP-запросы приложения, чтобы остальной код
// не знал деталей fetch, статусов и парсинга JSON.

import { API_BASE_URL } from "./config.js";

// Внутренняя утилита: выполняет fetch и разбирается с ответом.
// Возвращает:
//   - null, если сервер ответил 204 (No Content) — тело отсутствует;
//   - распарсенный JSON для успешных ответов с телом;
//   - бросает Error с понятным сообщением в остальных случаях.
async function request(path, options = {}) {
    let response;

    try {
        response = await fetch(`${API_BASE_URL}${path}`, {
            headers: {
                "Content-Type": "application/json",
                ...(options.headers || {}),
            },
            ...options,
        });
    } catch (networkError) {
        // Сюда попадаем, если сервер недоступен, сеть упала или запрос заблокирован.
        throw new Error(`Network error: ${networkError.message}`);
    }

    // 204 No Content — тело пустое, парсить нечего.
    if (response.status === 204) {
        return null;
    }

    // Пробуем прочитать тело как JSON (на ошибках сервер отдаёт { message }).
    let data = null;
    try {
        data = await response.json();
    } catch {
        // Тело не JSON — оставляем data = null, это не критично.
        data = null;
    }

    if (!response.ok) {
        const message = data && data.message ? data.message : `HTTP ${response.status}`;
        throw new Error(message);
    }

    return data;
}

// GET /recipes — список рецептов (карточки, без ингредиентов и инструкций).
export function getRecipes() {
    return request("/recipes");
}

// GET /recipes/:id — подробности рецепта.
// Важно: backend в этом ответе НЕ отдаёт isFavorite,
// состояние избранного берём из общего стора.
export function getRecipe(id) {
    return request(`/recipes/${id}`);
}

// GET /recipes/recently-viewed — недавно просмотренные рецепты.
export function getRecentlyViewed() {
    return request("/recipes/recently-viewed");
}

// PATCH /recipes/:id/favorite — обновление статуса избранного.
// body: { isFavorite: boolean }
export function setFavorite(id, isFavorite) {
    return request(`/recipes/${id}/favorite`, {
        method: "PATCH",
        body: JSON.stringify({ isFavorite }),
    });
}

// POST /recipes/:id/view — отметка просмотра рецепта.
// Backend отвечает 204, тело не возвращается.
export function markViewed(id) {
    return request(`/recipes/${id}/view`, {
        method: "POST",
    });
}