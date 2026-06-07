import re
import math
import hashlib

# Standard English stop words
STOP_WORDS = {
    'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'arent', 'as', 'at',
    'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by', 'cant', 'cannot', 'could',
    'did', 'didnt', 'do', 'does', 'doesnt', 'doing', 'dont', 'down', 'during', 'each', 'few', 'for', 'from', 'further',
    'had', 'hadnt', 'has', 'hasnt', 'have', 'havent', 'having', 'he', 'hed', 'hell', 'hes', 'her', 'here', 'heres',
    'hers', 'herself', 'him', 'himself', 'his', 'how', 'hows', 'i', 'id', 'ill', 'im', 'ive', 'if', 'in', 'into', 'is',
    'isnt', 'it', 'its', 'itself', 'lets', 'me', 'more', 'most', 'mustnt', 'my', 'myself', 'no', 'nor', 'not', 'of',
    'off', 'on', 'once', 'only', 'or', 'other', 'ought', 'our', 'ours', 'ourselves', 'out', 'over', 'own', 'same',
    'shant', 'she', 'shed', 'shell', 'shes', 'should', 'shouldnt', 'so', 'some', 'such', 'than', 'that', 'thats',
    'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there', 'theres', 'these', 'they', 'theyd', 'theyll',
    'theyre', 'theyve', 'this', 'those', 'through', 'to', 'too', 'under', 'until', 'up', 'very', 'was', 'wasnt',
    'we', 'wed', 'well', 'were', 'weve', 'werent', 'what', 'whats', 'when', 'whens', 'where', 'wheres', 'which',
    'while', 'who', 'whos', 'whom', 'why', 'whys', 'with', 'wont', 'would', 'wouldnt', 'you', 'youd', 'youll',
    'youre', 'youve', 'your', 'yours', 'yourself', 'yourselves'
}

def tokenize(text):
    if not text:
        return []
    # Lowercase and find alphanumeric tokens
    tokens = re.findall(r'[a-z0-9]+', text.lower())
    return [t for t in tokens if t not in STOP_WORDS]

class VectorSearchEngine:
    def __init__(self, dimensions=128):
        self.dimensions = dimensions

    def text_to_vector(self, text: str) -> list[float]:
        """
        Converts a text document into a L2-normalized dense vector using a hashing trick.
        This provides a fixed-dimension float array ideal for vector search.
        """
        tokens = tokenize(text)
        vector = [0.0] * self.dimensions
        if not tokens:
            return vector
            
        for token in tokens:
            # Stable MD5 hashing to map tokens to vector indices
            h = int(hashlib.md5(token.encode('utf-8')).hexdigest(), 16)
            index = h % self.dimensions
            
            # Simple TF weight with sign hashing to reduce collisions (standard Hashing Vectorizer)
            sign = 1.0 if (h >> 7) % 2 == 0 else -1.0
            vector[index] += sign
            
        # Compute L2 norm
        norm = math.sqrt(sum(x * x for x in vector))
        if norm > 0:
            vector = [x / norm for x in vector]
            
        return vector

    def cosine_similarity(self, v1: list[float], v2: list[float]) -> float:
        """
        Calculates the cosine similarity between two float vectors.
        """
        if len(v1) != len(v2) or len(v1) == 0:
            return 0.0
            
        dot_product = sum(x * y for x, y in zip(v1, v2))
        norm_v1 = math.sqrt(sum(x * x for x in v1))
        norm_v2 = math.sqrt(sum(y * y for y in v2))
        
        if norm_v1 == 0 or norm_v2 == 0:
            return 0.0
            
        return dot_product / (norm_v1 * norm_v2)

# Singleton Vector Search Engine
vector_engine = VectorSearchEngine(dimensions=128)
