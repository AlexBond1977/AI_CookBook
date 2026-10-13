// Рендер страницы рецепта: обложка, мета, ингредиенты,
// инструкция и кнопка избранного.

// Ссылки на DOM-узлы, которые нужны модулю.
let els = null;

// Действия (колбэки), которые передаёт main.js.
let actions = null;

// Инициализация модуля: один раз ищем контейнер,
// куда будем рендерить страницу рецепта.
export function initRecipe(appActions) {
    actions = appActions;
    els = {
        detail: document.getElementById("recipe-detail"),
    };
}

// Главная функция рендера страницы рецепта.
// state — снимок стора.
export function renderRecipe(state) {
    if (!els) return;

    // Состояние 1: идёт загрузка деталей.
    if (state.isLoadingRecipe) {
        els.detail.innerHTML = `<div class="recipe-loading"><div class="spinner"></div></div>`;
        return;
    }

    // Состояние 2: ошибка загрузки.
    if (state.error) {
        els.detail.innerHTML = `
      <div class="error-state">
        <p>Failed to load</p>
        <button type="button" class="retry-btn" id="recipe-retry-btn">Retry</button>
      </div>
    `;
        const retryBtn = document.getElementById("recipe-retry-btn");
        if (retryBtn) {
            retryBtn.addEventListener("click", () => actions.onRetry());
        }
        return;
    }

    // Состояние 3: рецепт не загружен (не должно случаться, но подстрахуемся).
    if (!state.currentRecipe) {
        els.detail.innerHTML = "";
        return;
    }

    renderRecipeContent(state);
}

// --- Внутренние функции ---

function renderRecipeContent(state) {
    const recipe = state.currentRecipe;

    // Состояние избранного берём из общего списка: backend не отдаёт
    // isFavorite в ответе GET /recipes/:id.
    const recipeInList = state.recipes.find((r) => r.id === recipe.id);
    const isFavorite = recipeInList ? recipeInList.isFavorite : false;

    // Полностью пересобираем содержимое контейнера.
    els.detail.innerHTML = "";

    // Обложка.
    const media = document.createElement("div");
    media.className = "recipe-media";

    const img = document.createElement("img");
    img.className = "recipe-image";
    img.src = recipe.image;
    img.alt = recipe.title;
    media.appendChild(img);

    els.detail.appendChild(media);

    // Верхняя строка: заголовок + кнопка избранного.
    const head = document.createElement("div");
    head.className = "recipe-head";

    const title = document.createElement("h2");
    title.className = "recipe-title";
    title.textContent = recipe.title;

    const favBtn = document.createElement("button");
    favBtn.type = "button";
    favBtn.className = "recipe-fav";
    if (isFavorite) {
        favBtn.classList.add("is-active");
        favBtn.setAttribute("aria-label", "Remove from favorites");
        favBtn.textContent = "❤️ Remove from favorites";
    } else {
        favBtn.setAttribute("aria-label", "Add to favorites");
        favBtn.textContent = "🤍 Add to favorites";
    }
    favBtn.addEventListener("click", () => {
        actions.onToggleFavorite(recipe);
    });

    head.appendChild(title);
    head.appendChild(favBtn);

    els.detail.appendChild(head);

    // Мета: категория и время.
    const meta = document.createElement("div");
    meta.className = "recipe-meta";

    const category = document.createElement("span");
    category.className = "recipe-category";
    category.textContent = recipe.category;

    const time = document.createElement("span");
    time.className = "recipe-time";
    time.textContent = `⏱ ${recipe.cookTime} min`;

    meta.appendChild(category);
    meta.appendChild(time);

    els.detail.appendChild(meta);

    // Ингредиенты.
    const ingredientsSection = document.createElement("section");
    ingredientsSection.className = "recipe-section";

    const ingredientsTitle = document.createElement("h3");
    ingredientsTitle.className = "recipe-section-title";
    ingredientsTitle.textContent = "Ingredients";

    const ingredientsList = document.createElement("ul");
    ingredientsList.className = "recipe-ingredients";
    for (const item of recipe.ingredients) {
        const li = document.createElement("li");
        li.textContent = item;
        ingredientsList.appendChild(li);
    }

    ingredientsSection.appendChild(ingredientsTitle);
    ingredientsSection.appendChild(ingredientsList);
    els.detail.appendChild(ingredientsSection);

    // Инструкция.
    const instructionsSection = document.createElement("section");
    instructionsSection.className = "recipe-section";

    const instructionsTitle = document.createElement("h3");
    instructionsTitle.className = "recipe-section-title";
    instructionsTitle.textContent = "Instructions";

    const instructionsText = document.createElement("p");
    instructionsText.className = "recipe-instructions";
    instructionsText.textContent = recipe.instructions;

    instructionsSection.appendChild(instructionsTitle);
    instructionsSection.appendChild(instructionsText);
    els.detail.appendChild(instructionsSection);
}