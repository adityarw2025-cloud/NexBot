from flask import Flask, render_template, jsonify, request
from google import genai

app = Flask(__name__)
client = genai.Client(api_key="API KEY")


ACTIVE_MODEL = "gemini-3.5-flash"

@app.route("/")
def hello_world():
    return render_template("index.html")

@app.route('/chat', methods=['POST'])
def chat():

    try:
        data = request.get_json()
        user_message = data["message"]
        history = data.get("history", []) 
        data = request.get_json()  
        user_message = data['message']
        
        
       
        response = client.models.generate_content(
            model=ACTIVE_MODEL,
            contents=user_message
        )
        reply = response.text
        
        return jsonify({"reply": reply})
        
        
    except Exception as e:
        return jsonify({"error": str(e)})

if __name__ == "__main__":
    app.run(debug=True, port=8000)