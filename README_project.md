```markdown
# 📌 Proyecto: API de Gestión de Proyectos

## 🏗 Controlador: `projectController.js`

Este controlador gestiona los proyectos dentro del sistema, permitiendo **crear, actualizar, eliminar y listar proyectos**. También proporciona una ruta para obtener los **valores enumerados (`enums`)** usados en los proyectos.

---

## 🚀 Rutas Disponibles (`projectRoutes.js`)

| Método | Endpoint | Descripción | Permiso Requerido |
|--------|-------------------|----------------------------------------------|------------------|
| `POST` | `/api/projects/` | Crea un nuevo proyecto | `CREATE_PROJECT` |
| `PUT` | `/api/projects/:id` | Actualiza un proyecto por ID | `UPDATE_PROJECT` |
| `DELETE` | `/api/projects/:id` | Elimina un proyecto por ID | `DELETE_PROJECT` |
| `GET` | `/api/projects/` | Obtiene la lista de proyectos | `READ_PROJECT` |
| `GET` | `/api/projects/:id` | Obtiene un proyecto por ID | `READ_PROJECT` |
| `GET` | `/api/projects/enums` | Obtiene los valores de los enums usados en el sistema | `READ_PROJECT` |

---

## 🔧 Detalles Técnicos del Controlador

### 📍 1. Crear un Proyecto
📌 **Endpoint:**  
```http
POST /api/projects/
```
🔐 **Requiere Permiso:** `CREATE_PROJECT`  

📥 **Cuerpo de la solicitud (JSON)**  
```json
{
    "project_name": "Gestor de Casos de Prueba",
    "description": "Plataforma para gestionar casos de prueba y reportes",
    "product_manager": "65dfg876ab90123", 
    "celula": "65abc321df90001", 
    "keywords": ["65def56789abcd", "65ghi12345efgh"],
    "project_category": "Aplicación Web - SaaS",
    "business_model": "B2B - Negocios a Negocios",
    "security_level": "Alto - Cumple con normativas (ISO, GDPR)",
    "execution_platform": "Web",
    "maintenance_status": "Activo - Desarrollo en curso",
    "priority": "Alta - Proyecto estratégico",
    "complexity": "Media - Integración con otros sistemas"
}
```
📤 **Ejemplo de respuesta (JSON)**  
```json
{
    "message": "Proyecto creado exitosamente",
    "project": {
        "project_id": "PRY-0001",
        "_id": "65abcde12345fgh6789",
        "project_name": "Gestor de Casos de Prueba",
        "description": "Plataforma para gestionar casos de prueba y reportes",
        "product_manager": { "_id": "65dfg876ab90123", "username": "pm_user" },
        "celula": { "_id": "65abc321df90001", "name": "QA Team" },
        "keywords": [{ "_id": "65def56789abcd", "name": "Test Automation" }],
        "project_category": "Aplicación Web - SaaS",
        "business_model": "B2B - Negocios a Negocios",
        "security_level": "Alto - Cumple con normativas (ISO, GDPR)",
        "execution_platform": "Web",
        "maintenance_status": "Activo - Desarrollo en curso",
        "priority": "Alta - Proyecto estratégico",
        "complexity": "Media - Integración con otros sistemas",
        "created_at": "2025-02-06T12:00:00Z"
    }
}
```

---

### 📍 2. Obtener la Lista de Proyectos
📌 **Endpoint:**  
```http
GET /api/projects/
```
🔐 **Requiere Permiso:** `READ_PROJECT`

📤 **Ejemplo de respuesta (JSON)**  
```json
[
    {
        "project_id": "PRY-0001",
        "_id": "65abcde12345fgh6789",
        "project_name": "Gestor de Casos de Prueba",
        "description": "Plataforma para gestionar casos de prueba y reportes",
        "product_manager": { "_id": "65dfg876ab90123", "username": "pm_user" },
        "celula": { "_id": "65abc321df90001", "name": "QA Team" },
        "keywords": [{ "_id": "65def56789abcd", "name": "Test Automation" }],
        "project_category": "Aplicación Web - SaaS",
        "business_model": "B2B - Negocios a Negocios",
        "security_level": "Alto - Cumple con normativas (ISO, GDPR)",
        "execution_platform": "Web",
        "maintenance_status": "Activo - Desarrollo en curso",
        "priority": "Alta - Proyecto estratégico",
        "complexity": "Media - Integración con otros sistemas",
        "created_at": "2025-02-06T12:00:00Z"
    }
]
```

---

### 📍 4. Resumen de los Enums Disponibles
📌 **Endpoint:**  
```http
GET /api/projects/enums
```
🔐 **Requiere Permiso:** `READ_PROJECT`

📥 **Resumen de Enums**

- **`project_category`** → Tipos de proyectos disponibles
- **`business_model`** → Modelos de negocio asociados
- **`security_level`** → Niveles de seguridad requeridos
- **`execution_platform`** → Plataformas donde se ejecuta el proyecto
- **`maintenance_status`** → Estado del mantenimiento del proyecto
- **`priority`** → Nivel de prioridad del proyecto
- **`complexity`** → Nivel de complejidad del desarrollo
```

