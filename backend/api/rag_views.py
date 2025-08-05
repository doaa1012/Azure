import os
import fitz  # PyMuPDF
import chromadb
import cohere
import json
from pathlib import Path
from rest_framework.response import Response
from django.http import JsonResponse, HttpResponseBadRequest
from django.views.decorators.csrf import csrf_exempt

# Ensure TensorFlow is disabled for sentence-transformers if needed
os.environ["USE_TF"] = "0"
from sentence_transformers import SentenceTransformer


# Initialize once
model = SentenceTransformer("all-MiniLM-L6-v2")
co = cohere.Client("dwMzH1bxG9Mq8pOJv6B83aFMWWKsq70q7N5D17wi")  # replace with your key
chroma_client = chromadb.PersistentClient(path="chroma_db")
collection = chroma_client.get_or_create_collection(name="pdf_collection")


def index_pdf_chunks():
    """
    Index all PDFs in the 'downloaded_pdfs' directory.
    Each PDF is split into chunks and embedded into ChromaDB.
    """
    pdf_dir = os.path.join(Path(__file__).resolve().parent, "downloaded_pdfs")

    if not os.path.exists(pdf_dir):
        print(f"❌ Folder '{pdf_dir}' not found.")
        return False

    existing_count = collection.count()
    all_chunks = []

    print("📄 Checking for PDFs to index...")
    for filename in os.listdir(pdf_dir):
        if not filename.endswith(".pdf"):
            continue
        file_path = os.path.join(pdf_dir, filename)

        # Skip already indexed files (using source metadata)
        # If ChromaDB supported checking existing sources, we would do it here

        try:
            doc = fitz.open(file_path)
            text = " ".join([page.get_text() for page in doc])
            doc.close()
        except Exception as e:
            print(f"⚠️ Skipping file {filename}: {e}")
            continue

        words = text.split()
        for i in range(0, len(words), 250):
            chunk = " ".join(words[i:i + 300])
            all_chunks.append({"text": chunk, "source": filename})

    if not all_chunks:
        print("⚠️ No content found in PDFs.")
        return False

    print(f"📥 Embedding {len(all_chunks)} chunks...")

    texts = [c["text"] for c in all_chunks]
    embeddings = model.encode(texts, convert_to_tensor=False)

    collection.add(
        embeddings=embeddings,
        documents=texts,
        metadatas=[{"source": c["source"]} for c in all_chunks],
        ids=[f"doc_{existing_count + i}" for i in range(len(texts))]
    )

    print("✅ Finished indexing PDFs.")
    return True

@csrf_exempt
def rag_query_view(request):
    if request.method != "POST":
        return HttpResponseBadRequest("Only POST allowed")

    try:
        data = json.loads(request.body.decode("utf-8"))
        query = data.get("query", "").strip()
        rebuild = data.get("rebuild", False)

        if not query:
            return JsonResponse({"error": "No query provided."}, status=400)

        if rebuild:
            print("♻️ Rebuilding ChromaDB from scratch...")
            collection.delete()
            index_pdf_chunks()

        doc_count = collection.count()
        print(f"📦 Documents in Chroma DB: {doc_count}")

        if doc_count == 0:
            print("⚠️ Chroma DB is empty. Trying to index PDFs...")
            indexed = index_pdf_chunks()
            if not indexed:
                return JsonResponse({
                    "answer": "No valid PDFs found to index. Please upload PDFs into 'downloaded_pdfs/'."
                }, status=400)

        print("📩 Query received:", query)
        query_embedding = model.encode(query, convert_to_tensor=False).tolist()

        results = collection.query(
            query_embeddings=[query_embedding],
            n_results=5,
            include=["documents", "metadatas"]
        )

        chunks = results.get("documents", [[]])[0]
        sources = results.get("metadatas", [[]])[0]

        if not chunks:
            return JsonResponse({"answer": "No relevant content found in PDFs."})

        context = "\n\n".join(chunks[:3])
        prompt = (
            f"You are a helpful scientific assistant. Use the context below to answer the question.\n\n"
            f"Context:\n{context}\n\nQuestion: {query}\n\nAnswer:"
        )

        response = co.generate(
            prompt=prompt,
            max_tokens=512,
            temperature=0.0,
        )

        return JsonResponse({
            "answer": response.generations[0].text.strip(),
            "chunks": chunks,
            "sources": sources
        })

    except Exception as e:
        print("❌ Exception occurred in rag_query_view:", str(e))
        return JsonResponse({"error": f"Internal error: {str(e)}"}, status=500)
