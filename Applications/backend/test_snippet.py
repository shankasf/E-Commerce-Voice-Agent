from openai import OpenAI
from dotenv import load_dotenv

load_dotenv(override=True)

client = OpenAI()

response = client.responses.create(
    model="gpt-4o",
    input = "tell me a joke"
)

print(response.output_text)