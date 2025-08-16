// scripts.js

document.addEventListener('DOMContentLoaded', () => {
    // 要素の取得
    const uploadForm = document.getElementById('uploadForm');
    const imageInput = document.getElementById('imageInput');
    const meatOptions = document.getElementById('meat-options');
    const meatForm = document.getElementById('meatForm');
    const detectedIngredientsSection = document.getElementById('detected-ingredients');
    const ingredientsList = document.querySelector('.ingredients-list');
    const recipesSection = document.getElementById('recipes');
    const recipesGrid = document.querySelector('.recipes-grid');
    const loadingScreen = document.getElementById('loading-screen');
    const uploadedImage = document.getElementById('uploadedImage');

    let storedImageFile = null; // 選択した画像ファイルを保持する変数

    // ページ読み込み時に不要なセクションを非表示に
    meatOptions.style.display = 'none';
    detectedIngredientsSection.style.display = 'none';
    recipesSection.style.display = 'none';
    loadingScreen.style.display = 'none';

    // フォームの送信イベントの追加
    uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!imageInput.files || imageInput.files.length === 0) {
            alert('画像を選択してください。');
            return;
        }

        storedImageFile = imageInput.files[0];

        // 選択した画像を表示
        const reader = new FileReader();
        reader.onload = function(e) {
            uploadedImage.src = e.target.result;
        };
        reader.readAsDataURL(storedImageFile);

        // ローディング画面を表示
        loadingScreen.style.display = 'flex';

        const formData = new FormData();
        formData.append('image', storedImageFile);

        try {
            const response = await fetch('/detect', {
                method: 'POST',
                body: formData
            });
            const data = await response.json();
            loadingScreen.style.display = 'none';

            if (data.meat_options) {
                meatOptions.style.display = 'flex';
                detectedIngredientsSection.style.display = 'none';
                recipesSection.style.display = 'none';
            } else if (data.error) {
                showAlert(data.error, 'error');
            } else {
                displayResults(data);
            }
        } catch (error) {
            loadingScreen.style.display = 'none';
            console.error('エラーが発生しました:', error);
            showAlert('サーバーでエラーが発生しました。', 'error');
        }
    });

    // お肉の種類選択フォームの送信イベントの追加
    meatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const meatChoice = meatForm.elements['meat_choice'].value;

        if (!meatChoice) {
            alert('お肉の種類を選択してください。');
            return;
        }

        // ローディング画面を表示
        loadingScreen.style.display = 'flex';

        const formData = new FormData();
        formData.append('image', storedImageFile);
        formData.append('meat_choice', meatChoice);

        try {
            const response = await fetch('/detect', {
                method: 'POST',
                body: formData
            });
            const data = await response.json();
            loadingScreen.style.display = 'none';
            meatOptions.style.display = 'none';

            if (data.error) {
                showAlert(data.error, 'error');
            } else {
                displayResults(data);
            }
        } catch (error) {
            loadingScreen.style.display = 'none';
            console.error('エラーが発生しました:', error);
            showAlert('サーバーでエラーが発生しました。', 'error');
        }
    });

    // 結果を表示する関数
    function displayResults(data) {
        // 検出された食材を表示
        if (data.detected_ingredients) {
            detectedIngredientsSection.style.display = 'block';
            ingredientsList.innerHTML = ''; // リストをクリア

            data.detected_ingredients.forEach(ingredient => {
                const ingredientTag = document.createElement('span');
                ingredientTag.className = 'ingredient-tag';
                ingredientTag.textContent = ingredient;
                ingredientsList.appendChild(ingredientTag);
            });
        } else {
            detectedIngredientsSection.style.display = 'none';
        }

        // レシピを表示
        if (data.recipes) {
            recipesSection.style.display = 'block';
            recipesGrid.innerHTML = '';
            data.recipes.forEach(recipe => {
                const recipeCard = createRecipeCard(recipe);
                recipesGrid.appendChild(recipeCard);
            });
        } else if (data.message) {
            recipesSection.style.display = 'block';
            recipesGrid.innerHTML = `<p>${data.message}</p>`;
        } else {
            recipesSection.style.display = 'none';
        }
    }

    // レシピカードを作成する関数
    function createRecipeCard(recipe) {
        const recipeCard = document.createElement('div');
        recipeCard.className = 'recipe-card';

        // レシピ画像（プレースホルダー）
        const recipeImage = document.createElement('img');
        recipeImage.src = '/static/images/recipe-placeholder.jpg';
        recipeImage.alt = 'レシピ画像';

        const recipeTitle = document.createElement('h3');
        recipeTitle.textContent = recipe.RecipeName;

        const recipeIngredients = document.createElement('p');
        recipeIngredients.textContent = '材料: ' + recipe.Ingredients;

        // 作り方（手順）を表示
        const recipeInstructions = document.createElement('div');
        recipeInstructions.className = 'recipe-instructions';
        recipeInstructions.innerHTML = '<h4>作り方</h4>';

        // 手順を改行または句点で分割
        const instructions = recipe.Instruction.split(/\r?\n|。/).filter(s => s.trim() !== '');

        const instructionList = document.createElement('ol');
        instructions.forEach(instruction => {
            const instructionItem = document.createElement('li');
            instructionItem.textContent = instruction.trim();
            instructionList.appendChild(instructionItem);
        });

        recipeInstructions.appendChild(instructionList);

        // レシピカードに要素を追加
        recipeCard.appendChild(recipeImage);
        recipeCard.appendChild(recipeTitle);
        recipeCard.appendChild(recipeIngredients);
        recipeCard.appendChild(recipeInstructions);

        return recipeCard;
    }

    // アラートを表示する関数
    function showAlert(message, type) {
        // 簡易的なアラート表示のロジック
        const alertBox = document.createElement('div');
        alertBox.className = `alert ${type}`;
        alertBox.textContent = message;
        document.body.appendChild(alertBox);
        setTimeout(() => {
            alertBox.remove();
        }, 3000);
    }
});
