// Main application logic, routing, and state management

const App = {
  state: {
    currentView: 'home',
    products: [],
    meals: [],
    dailyLog: {},
    selectedProduct: null,
    selectedMeal: null,
    scanResult: null,
    mealBuilder: {
      name: '',
      items: []
    }
  },

  init() {
    this.loadState();
    this.setupNavigation();
    this.setupCamera();
    this.setupEventListeners();
    this.render();
  },

  loadState() {
    const saved = localStorage.getItem('nutriscan_state');
    if (saved) {
      const parsed = JSON.parse(saved);
      this.state.products = parsed.products || [];
      this.state.meals = parsed.meals || [];
      this.state.dailyLog = parsed.dailyLog || {};
    }
  },

  saveState() {
    localStorage.setItem('nutriscan_state', JSON.stringify({
      products: this.state.products,
      meals: this.state.meals,
      dailyLog: this.state.dailyLog
    }));
  },

  setupNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const view = item.dataset.view;
        this.navigate(view);
      });
    });
  },

  navigate(view) {
    this.state.currentView = view;
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    const target = document.getElementById(`view-${view}`);
    if (target) {
      target.classList.add('active');
    }
    this.updateNav();
    this.render();
  },

  updateNav() {
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.view === this.state.currentView);
    });
  },

  setupCamera() {
    const fileInput = document.getElementById('fileInput');
    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
          this.handleImageUpload(file);
        }
      });
    }
  },

  async handleImageUpload(file) {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target.result;
      this.showLoading(true);
      try {
        const result = await Api.extractNutrition(base64);
        this.state.scanResult = result;
        this.navigate('scan-result');
        this.render();
      } catch (error) {
        console.error('OCR failed:', error);
        this.showError('No se pudo extraer la información nutricional. Intenta con otra foto.');
      } finally {
        this.showLoading(false);
      }
    };
    reader.readAsDataURL(file);
  },

  setupEventListeners() {
    // Save product from scan result
    const saveBtn = document.getElementById('saveProductBtn');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => this.saveProductFromScan());
    }

    // Cancel scan
    const cancelBtn = document.getElementById('cancelScanBtn');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        this.state.scanResult = null;
        this.navigate('home');
      });
    }

    // Add meal item
    const addMealItemBtn = document.getElementById('addMealItemBtn');
    if (addMealItemBtn) {
      addMealItemBtn.addEventListener('click', () => this.addMealItem());
    }

    // Save meal
    const saveMealBtn = document.getElementById('saveMealBtn');
    if (saveMealBtn) {
      saveMealBtn.addEventListener('click', () => this.saveMeal());
    }

    // Log meal to daily tracker
    const logMealBtn = document.getElementById('logMealBtn');
    if (logMealBtn) {
      logMealBtn.addEventListener('click', () => this.logMeal());
    }

    // Delete product
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('delete-product')) {
        const id = parseInt(e.target.dataset.id);
        this.deleteProduct(id);
      }
      if (e.target.classList.contains('delete-meal')) {
        const id = parseInt(e.target.dataset.id);
        this.deleteMeal(id);
      }
      if (e.target.classList.contains('delete-log')) {
        const date = e.target.dataset.date;
        this.deleteLogEntry(date);
      }
    });

    // Edit meal item grams
    document.addEventListener('change', (e) => {
      if (e.target.classList.contains('meal-item-grams')) {
        const index = parseInt(e.target.dataset.index);
        const grams = parseFloat(e.target.value);
        if (this.state.mealBuilder.items[index]) {
          this.state.mealBuilder.items[index].grams = grams;
        }
      }
    });
  },

  saveProductFromScan() {
    if (!this.state.scanResult) return;

    const name = document.getElementById('productNameInput')?.value || 'Producto sin nombre';
    const product = {
      id: Date.now(),
      name: name,
      nutrition: this.state.scanResult,
      createdAt: new Date().toISOString()
    };

    this.state.products.push(product);
    this.saveState();
    this.state.scanResult = null;
    this.navigate('products');
  },

  addMealItem() {
    const select = document.getElementById('mealProductSelect');
    const gramsInput = document.getElementById('mealItemGrams');
    
    if (!select || !gramsInput) return;

    const productId = parseInt(select.value);
    const grams = parseFloat(gramsInput.value);

    if (!productId || !grams) {
      this.showError('Selecciona un producto e ingresa los gramos.');
      return;
    }

    const product = this.state.products.find(p => p.id === productId);
    if (!product) return;

    this.state.mealBuilder.items.push({
      productId: productId,
      productName: product.name,
      grams: grams,
      nutrition: this.calculateItemNutrition(product, grams)
    });

    this.renderMealBuilder();
  },

  calculateItemNutrition(product, grams) {
    const ratio = grams / 100;
    const nutrition = {};
    for (const [key, value] of Object.entries(product.nutrition)) {
      nutrition[key] = Math.round(value * ratio * 100) / 100;
    }
    return nutrition;
  },

  getTotalMealNutrition() {
    const totals = {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      saturatedFat: 0,
      sugar: 0,
      fiber: 0,
      sodium: 0
    };

    this.state.mealBuilder.items.forEach(item => {
      for (const key of Object.keys(totals)) {
        totals[key] += (item.nutrition[key] || 0);
      }
    });

    // Round all values
    for (const key of Object.keys(totals)) {
      totals[key] = Math.round(totals[key] * 100) / 100;
    }

    return totals;
  },

  saveMeal() {
    const name = document.getElementById('mealNameInput')?.value || 'Comida sin nombre';
    
    if (this.state.mealBuilder.items.length === 0) {
      this.showError('Agrega al menos un producto a la comida.');
      return;
    }

    const meal = {
      id: Date.now(),
      name: name,
      items: [...this.state.mealBuilder.items],
      totalNutrition: this.getTotalMealNutrition(),
      createdAt: new Date().toISOString()
    };

    this.state.meals.push(meal);
    this.saveState();
    this.state.mealBuilder = { name: '', items: [] };
    this.navigate('meals');
  },

  logMeal() {
    if (this.state.mealBuilder.items.length === 0) {
      this.showError('Agrega al menos un producto a la comida.');
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    if (!this.state.dailyLog[today]) {
      this.state.dailyLog[today] = [];
    }

    const meal = {
      id: Date.now(),
      name: document.getElementById('mealNameInput')?.value || 'Comida',
      items: [...this.state.mealBuilder.items],
      totalNutrition: this.getTotalMealNutrition(),
      loggedAt: new Date().toISOString()
    };

    this.state.dailyLog[today].push(meal);
    this.saveState();
    this.state.mealBuilder = { name: '', items: [] };
    this.navigate('tracker');
  },

  deleteProduct(id) {
    this.state.products = this.state.products.filter(p => p.id !== id);
    this.saveState();
    this.render();
  },

  deleteMeal(id) {
    this.state.meals = this.state.meals.filter(m => m.id !== id);
    this.saveState();
    this.render();
  },

  deleteLogEntry(date) {
    if (this.state.dailyLog[date]) {
      delete this.state.dailyLog[date];
      this.saveState();
      this.render();
    }
  },

  showLoading(show) {
    const loading = document.getElementById('loadingOverlay');
    if (loading) {
      loading.style.display = show ? 'flex' : 'none';
    }
  },

  showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    document.body.appendChild(errorDiv);
    setTimeout(() => errorDiv.remove(), 3000);
  },

  render() {
    switch (this.state.currentView) {
      case 'home':
        UI.renderHome();
        break;
      case 'scan':
        UI.renderScan();
        break;
      case 'scan-result':
        UI.renderScanResult();
        break;
      case 'products':
        UI.renderProducts();
        break;
      case 'meals':
        UI.renderMeals();
        break;
      case 'meal-builder':
        UI.renderMealBuilder();
        break;
      case 'tracker':
        UI.renderTracker();
        break;
    }
  }
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = App;
}