==============================================================
BOOK RECOMENDATION SYSTEM - PROJECT EXPLANATION GUIDE
==============================================================

Hello! This file is designed to help you easily understand 
and explain your project. It breaks down the files we created 
and explains the core Machine Learning algorithm (KNN) in 
simple terms.

--------------------------------------------------------------
1. PROJECT STRUCTURE & FILES
--------------------------------------------------------------
The project is split into two main parts: the Backend (Brain) 
and the Frontend (Face).

# BACKEND (The Brain - Python & FastAPI)
Location: D:\ML_miniproject\backend\

- app/main.py
  This is the main server file. It handles all the API requests 
  from the website, like searching for books or asking for 
  recommendations.
  
- app/ml/recommender.py
  This is where the magic happens! This file contains the actual 
  Machine Learning code and the KNN algorithm that figures out 
  which books to recommend based on user data.

- generate_data.py & prepare_data.py
  These are helper scripts we used early on to generate mock 
  users, ratings, and prepare the book data so our ML model 
  has information to learn from.


# FRONTEND (The Face - Next.js & React)
Location: D:\ML_miniproject\frontend\

- src/app/page.tsx
  This is the "Who is reading today?" profile selection screen 
  that shows up when you first open the app.
  
- src/app/browse/page.tsx
  This is the main scrolling page with the Hero Banner and 
  all the horizontal carousels (Trending Now, Popular Series).
  
- src/components/BookCard.tsx & BookDetailModal.tsx
  These are the individual building blocks. The BookCard is the 
  image you click on in a carousel. The Modal is the big pop-up 
  window that shows the AI Insights and "More Like This" books.

- src/store/useStore.ts
  This acts as the memory for the website. It remembers which 
  user is logged in and what books are saved to "My List".


--------------------------------------------------------------
2. HOW WE USED THE KNN ALGORITHM
--------------------------------------------------------------

What is KNN?
KNN stands for "K-Nearest Neighbors." It is one of the simplest 
and most effective Machine Learning algorithms. 

Think of it like this: If you want to know what genre of music 
a new person might like, look at their 5 closest friends. If 4 
of their friends like Jazz, chances are the new person will 
also like Jazz. That's exactly what KNN does! "K" is just a 
variable that stands for the number of neighbors we look at (like K=5).

How do we use it in this Book Recommendation App?
In our app, we use a specific variation of KNN called 
"Item-Based Collaborative Filtering." Here is the simple breakdown 
of how it works step-by-step:

Step 1: The Matrix (Not the movie!)
We create a massive grid (matrix) behind the scenes. 
- Every row is a Book.
- Every column is a User.
- The numbers inside the grid are the Ratings (1 to 10) that 
  users gave to those books.

Step 2: Plotting books in space
Because we have this grid, the computer can treat every single 
book as a point in a massive multi-dimensional graph. 
Books that are rated similarly by the exact same users will end 
up being plotted very close to each other on this invisible graph.

Step 3: Finding the "Nearest Neighbors"
When a user clicks on a book like "Harry Potter" to get 
recommendations, our algorithm looks at where "Harry Potter" 
is plotted on the graph. 
It then draws a circle and finds the "K" (for example, 5) 
books that are physically closest to it in that space. 
We measure the distance between books using a mathematical 
formula called "Cosine Similarity".

Step 4: Making the Recommendation
If "Lord of the Rings" and "Percy Jackson" are the closest points 
to "Harry Potter", our KNN algorithm grabs those books and sends 
them to the frontend. The website then displays them in the 
"More Like This" carousel!

Why is this cool?
The algorithm doesn't actually know *what* the book is about! 
It doesn't read the summary or know that Harry Potter has magic. 
It simply knows that: "People who rated Harry Potter a 10 also 
rated Percy Jackson a 10, therefore they must be similar." 
This is why it is called "Collaborative" filtering!

==============================================================
END OF GUIDE
==============================================================
