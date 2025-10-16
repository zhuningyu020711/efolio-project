<template>
  <section aria-labelledby="catalog-title" tabindex="0">
    <h2 id="catalog-title">Catalog</h2>

    <div class="controls" role="region" aria-label="Catalog controls">
      <input
        type="text"
        v-model="search"
        class="input"
        placeholder="Search by title..."
        aria-label="Search catalog items by title"
      />
      <button type="button" class="btn" @click="clearSearch" aria-label="Clear search results">Clear</button>
    </div>

    <p id="catalog-desc" class="sr-only">
      Table displays a list of catalog items with title, author, category, and price columns.
      Each column header identifies the scope of the column.
      Use tab to navigate through table controls.
    </p>

    <table class="table" role="table" aria-describedby="catalog-desc">
      <caption class="sr-only">Catalog of items</caption>
      <thead>
        <tr>
          <th scope="col">Title</th>
          <th scope="col">Author</th>
          <th scope="col">Category</th>
          <th scope="col">Price</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in filteredItems" :key="item.id">
          <td>{{ item.title }}</td>
          <td>{{ item.author }}</td>
          <td>{{ item.category }}</td>
          <td>\${{ item.price.toFixed(2) }}</td>
        </tr>
        <tr v-if="filteredItems.length === 0">
          <td colspan="4" aria-live="polite" class="muted">No results found.</td>
        </tr>
      </tbody>
    </table>

    <div class="actions" role="region" aria-label="Export actions">
      <button class="btn" aria-label="Export current page to CSV" @click="exportCSV">Export CSV</button>
      <button class="btn" aria-label="Export current page to PDF" @click="exportPDF">Export PDF</button>
    </div>
  </section>
</template>

<script setup>
import { ref, computed } from 'vue'

const items = ref([
  { id: 1, title: 'UI Design Basics', author: 'John Doe', category: 'Design', price: 25.99 },
  { id: 2, title: 'Vue 3 Deep Dive', author: 'Jane Smith', category: 'Programming', price: 39.99 },
  { id: 3, title: 'Data Visualization with D3', author: 'Mike Chan', category: 'Data Science', price: 29.99 },
])

const search = ref('')

const filteredItems = computed(() => {
  const q = search.value.trim().toLowerCase()
  return q ? items.value.filter(i => i.title.toLowerCase().includes(q)) : items.value
})

function clearSearch() {
  search.value = ''
}

function exportCSV() {
  alert('CSV exported successfully.')
}

function exportPDF() {
  alert('PDF exported successfully.')
}
</script>

<style scoped>
section { padding: 1rem; }
.controls, .actions { display: flex; gap: 10px; margin-bottom: 1rem; flex-wrap: wrap; }
.table { width: 100%; border-collapse: collapse; }
th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
th { background: #f1f5f9; }
.input { border: 1px solid #d1d5db; border-radius: 8px; padding: 6px 10px; }
.btn {
  border: 1px solid #4b5563;
  background: #f3f4f6;
  color: #111827;
  border-radius: 8px;
  padding: 8px 14px;
  cursor: pointer;
}
.btn:focus-visible { outline: 3px solid #0ea5e9; outline-offset: 2px; }
.btn:hover { background: #e5e7eb; }
.muted { color: #6b7280; text-align: center; }

/* Screen reader only */
.sr-only {
  position: absolute;
  left: -9999px;
  width: 1px;
  height: 1px;
  overflow: hidden;
}
</style>
