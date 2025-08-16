from flask import Flask, request, jsonify, render_template
from ultralytics import YOLO
import pandas as pd
from PIL import Image
import io

app = Flask(__name__)

# カスタムYOLOモデルのロード
model_path = "veg_dataset2/2nd_trainn30/weights/best.pt"
model = YOLO(model_path)

# レシピデータの読み込み
def load_recipe_list(file_path):
    df = pd.read_excel(file_path)
    return df

# レシピリストのExcelファイルを指定
recipe_file = "Recipe_lists.xlsx"
recipe_df = load_recipe_list(recipe_file)

# レシピの食材リストを加工
recipe_df['Ingredient_List'] = recipe_df['Ingredients'].apply(lambda x: [ingredient.strip() for ingredient in str(x).split(',')])

# 食材で作れるレシピを抽出
def find_recipes(food_list, recipe_df):
    available_recipes = []

    for _, row in recipe_df.iterrows():
        ingredients = row['Ingredient_List']
        
        # 検出された食材がレシピの必要な食材のいずれかに一致する場合
        if any(ingredient in food_list for ingredient in ingredients):
            available_recipes.append({
                'RecipeName': row['RecipeName'],
                'Ingredients': row['Ingredients'],
                'Instruction': row['Instruction'],
                'CookingTime': row.get('CookingTime', '')
            })
    
    return available_recipes

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/detect', methods=['POST'])
def detect():
    try:
        if 'image' not in request.files:
            return jsonify({'error': '画像がアップロードされていません。'}), 400

        file = request.files['image']
        if file.filename == '':
            return jsonify({'error': '画像がアップロードされていません。'}), 400

        img = Image.open(io.BytesIO(file.read())).convert('RGB')

        # リクエストから肉の選択を取得
        meat_choice = request.form.get('meat_choice')

        results = model.predict(source=img, conf=0.6, iou=0.3)
        food_list = []

        for result in results:
            class_names = result.names
            for box in result.boxes:
                class_id = int(box.cls)
                food_name = class_names[class_id]
                if food_name == 'meat':
                    if not meat_choice:
                        # お肉の種類を選択するオプションを返す
                        return jsonify({'meat_options': ['ground meat', 'chicken breast', 'chicken thigh', 'sliced beef', 'pork loin']}), 200
                    else:
                        food_name = meat_choice  # 選択されたお肉の種類を使用
                food_list.append(food_name)

        food_list = list(set(food_list))
        print("検出された食材:", food_list)

        available_recipes = find_recipes(food_list, recipe_df)

        if not available_recipes:
            return jsonify({'message': '作れるレシピがありません。', 'detected_ingredients': food_list}), 200

        return jsonify({'recipes': available_recipes, 'detected_ingredients': food_list})

    except Exception as e:
        print("エラーが発生しました:", e)
        return jsonify({'error': 'サーバーでエラーが発生しました。'}), 500

if __name__ == '__main__':
    app.run(debug=True)
