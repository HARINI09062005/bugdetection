# Sample Python file with intentional errors

# 1️⃣ Missing colon in if statement
if True  # ❌ ERROR: Missing colon
    print("This should cause an error")

# 2️⃣ Undefined variable
result = x + 5  # ❌ ERROR: x is not defined

# 3️⃣ Unmatched brackets
numbers = [1, 2, 3, 4  # ❌ ERROR: Missing closing bracket

# 4️⃣ Unmatched quotes
message = "Hello, world!  # ❌ ERROR: Missing closing quote

# 5️⃣ Function call with incorrect arguments
def add(a, b):
    return a + b

sum_result = add(5)  # ❌ ERROR: Missing one argument

# 6️⃣ Variable declared but never used
unused_var = 42  # ❌ ERROR: Declared but never used

# 7️⃣ Return outside function
return 10  # ❌ ERROR: Return statement outside function

# 8️⃣ Function redefinition
def greet():
    return "Hello"

def greet():  # ❌ ERROR: Function redefined
    return "Hi"

# 9️⃣ Unexpected indentation
    print("This line has unexpected indentation")  # ❌ ERROR

# 🔟 Inconsistent indentation
def my_function():
  x = 10
        y = 20  # ❌ ERROR: Inconsistent indentation
  return x + y

# ✅ Correct Code (Should Not Trigger Errors)
def say_hello(name):
    return f"Hello, {name}!"

print(say_hello("Alice"))
