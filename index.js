const tg = window.Telegram.WebApp;
tg.expand();

/* ======================
   DOM
====================== */

const addressInput = document.getElementById("address");
const suggestionsBox = document.getElementById("suggestions");

const privateHouseToggle = document.getElementById("private_house");
const handleBottleToggle = document.getElementById("handle_bottle");

const apartmentFields = document.getElementById("apartment_fields");

const entranceInput = document.getElementById("entrance");
const floorInput = document.getElementById("floor");
const apartmentInput = document.getElementById("apartment");

const bottlesInput = document.getElementById("bottles");
const commentInput = document.getElementById("comment");

const successOverlay = document.getElementById("success_overlay");

/* ======================
   АДРЕСНЫЕ ПОДСКАЗКИ
====================== */

let debounceTimer;

addressInput.addEventListener("input", () => {
    clearTimeout(debounceTimer);

    const value = addressInput.value.trim();

    if (value.length < 2) {
        suggestionsBox.innerHTML = "";
        return;
    }

    debounceTimer = setTimeout(() => {
        fetchSuggestions(value);
    }, 300);
});

async function fetchSuggestions(query) {
    try {
        const response = await fetch(
            `http://localhost:2080/api/suggest?query=${encodeURIComponent(query)}`
        );

        if (!response.ok) {
            throw new Error("Ошибка сервера");
        }

        const results = await response.json();

        if (!Array.isArray(results)) {
            console.error("Неверный формат ответа:", results);
            return;
        }

        renderSuggestions(results);

    } catch (error) {
        console.error("Ошибка получения подсказок:", error);
        suggestionsBox.innerHTML = "";
    }
}

function renderSuggestions(results) {
    suggestionsBox.innerHTML = "";

    if (!results || results.length === 0) {
        suggestionsBox.innerHTML =
            "<div class='suggestion-item'>Адрес не найден</div>";
        return;
    }

    results.forEach(address => {
        const div = document.createElement("div");
        div.className = "suggestion-item";
        div.textContent = address;

        div.addEventListener("click", () => {
            addressInput.value = address;
            suggestionsBox.innerHTML = "";
        });

        suggestionsBox.appendChild(div);
    });
}

/* ======================
   Частный дом
====================== */

privateHouseToggle.addEventListener("change", () => {
    if (privateHouseToggle.checked) {
        apartmentFields.style.display = "none";
    } else {
        apartmentFields.style.display = "grid";
    }
});

/* ======================
   ВАЛИДАЦИЯ
====================== */

function validateForm() {

    if (!addressInput.value.trim()) return false;

    if (!privateHouseToggle.checked) {
        if (!entranceInput.value || entranceInput.value <= 0) return false;
        if (!floorInput.value || floorInput.value <= 0) return false;
        if (!apartmentInput.value || apartmentInput.value <= 0) return false;
    }

    if (!bottlesInput.value || bottlesInput.value <= 0) return false;

    return true;
}

/* ======================
   ОТПРАВКА ЗАКАЗА
====================== */

document.getElementById("order_btn").onclick = function () {

    if (!validateForm()) {
        alert("Не все поля заполнены или указаны неверные значения.");
        return;
    }

    let finalComment = commentInput.value || "";

    if (privateHouseToggle.checked) {
        finalComment += " Частный дом.";
    }

    if (handleBottleToggle.checked) {
        finalComment += " Бутылка с ручкой.";
    }

    const data = {
        address: addressInput.value,
        entrance: privateHouseToggle.checked ? "" : entranceInput.value,
        floor: privateHouseToggle.checked ? "" : floorInput.value,
        apartment: privateHouseToggle.checked ? "" : apartmentInput.value,
        bottles: bottlesInput.value,
        comment: finalComment.trim()
    };

    tg.sendData(JSON.stringify(data));

    showSuccess();
};

/* ======================
   УВЕДОМЛЕНИЕ + ЗАКРЫТИЕ
====================== */

function showSuccess() {
    successOverlay.style.display = "flex";

    setTimeout(() => {
        tg.close();
    }, 2000);
}