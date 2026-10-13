// Рендер карточки рецепта.
// Используется на главной: в основном списке, в блоке избранных
// и в блоке недавно просмотренных.

// Опции:
//   recipe        — объект рецепта (id, title, category, image, cookTime, [isFavorite])
//   showFavorite  — показывать ли кнопку избранного (по умолчанию true).
//                   Для Recently Viewed backend не отдаёт isFavorite,
//                   поэтому там кнопку не рисуем.
//   onOpen        — колбэк, вызывается при клике по карточке (кроме сердечка).
//   onToggleFavorite — колбэк, вызывается при клике по сердечку.
export function createRecipeCard(recipe, options = {}) {
    const {
        showFavorite = true,
        onOpen = () => {},
        onToggleFavorite = () => {},
    } = options;

    // Корневой элемент карточки.
    const card = document.createElement("article");
    card.className = "card";
    card.dataset.id = recipe.id;

    // Обложка (картинка + сердечко поверх неё).
    const media = document.createElement("div");
    media.className = "card-media";

    const img = document.createElement("img");
    img.className = "card-image";
    img.src = recipe.image;
    img.alt = recipe.title;
    img.loading = "lazy";
    media.appendChild(img);

    // Сердечко-избранное.
    if (showFavorite) {
        const favBtn = document.createElement("button");
        favBtn.type = "button";
        favBtn.className = "card-fav";
        if (recipe.isFavorite) {
            favBtn.classList.add("is-active");
            favBtn.setAttribute("aria-label", "Remove from favorites");
            favBtn.textContent = "❤️";
        } else {
            favBtn.setAttribute("aria-label", "Add to favorites");
            favBtn.textContent = "🤍";
        }

        // Важно: останавливаем всплытие, чтобы клик по сердечку
        // не открывал страницу рецепта.
        favBtn.addEventListener("click", (event) => {
            event.stopPropagation();
            onToggleFavorite(recipe);
        });

        media.appendChild(favBtn);
    }

    card.appendChild(media);

    // Текстовый блок: название, категория, время.
    const body = document.createElement("div");
    body.className = "card-body";

    const title = document.createElement("h3");
    title.className = "card-title";
    title.textContent = recipe.title;

    const meta = document.createElement("div");
    meta.className = "card-meta";

    const category = document.createElement("span");
    category.className = "card-category";
    category.textContent = recipe.category;

    const time = document.createElement("span");
    time.className = "card-time";
    time.textContent = `⏱ ${recipe.cookTime} min`;

    meta.appendChild(category);
    meta.appendChild(time);

    body.appendChild(title);
    body.appendChild(meta);

    card.appendChild(body);

    // Клик по карточке (но не по сердечку) открывает рецепт.
    card.addEventListener("click", () => onOpen(recipe));

    return card;
}