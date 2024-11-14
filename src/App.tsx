import React, { useEffect, useRef, useState } from 'react';
import { UserWarning } from './UserWarning';
import { getTodos, USER_ID } from './api/todos';
import { Todo } from './types/Todo';
import * as Methods from './api/todos';

export const App: React.FC = () => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('All');
  const [newTodoTitle, setNewTodoTitle] = useState('');
  const [isInputDisabled, setIsInputDisabled] = useState(false);
  const [counter, setCounter] = useState<number>(0);
  const [loadingTodoId, setLoadingTodoId] = useState<number | null>(null);

  const newTodoInputRef = useRef<HTMLInputElement>(null);

  function updateCounter(arrTodo: Todo[]) {
    const activeTodosCount = arrTodo.filter(todo => !todo.completed).length;

    setCounter(activeTodosCount);
  }

  useEffect(() => {
    if (newTodoInputRef.current) {
      newTodoInputRef.current.focus();
    }
  }, [todos]);

  useEffect(() => {
    const fetchTodos = async () => {
      try {
        const fetchedTodos = await getTodos();

        setTodos(fetchedTodos);
        updateCounter(fetchedTodos);
      } catch {
        setError('Unable to load todos');
      }
    };

    fetchTodos();
  }, []);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError(null);
      }, 3000);

      return () => clearTimeout(timer);
    }

    return undefined;
  }, [error]);

  function deleteTodo(todoId: number) {
    setLoadingTodoId(todoId);

    Methods.deleteTodo(todoId)
      .then(() => {
        setTodos(prevTodos => prevTodos.filter(todo => todo.id !== todoId));
        updateCounter(todos.filter(todo => todo.id !== todoId));
      })
      .catch(() => {
        setError('Unable to delete a todo');
      })
      .finally(() => {
        setLoadingTodoId(null);
      });
  }

  const addTodo = async (event: React.FormEvent) => {
    event.preventDefault();

    if (newTodoTitle.trim() === '') {
      setError('Title should not be empty');

      return;
    }

    const trimmedTitle = newTodoTitle.trim();
    const tempId = Math.random();
    const tempTodoToAdd = {
      id: tempId,
      title: trimmedTitle,
      completed: false,
      userId: USER_ID,
    };

    setTodos([...todos, tempTodoToAdd]);

    setLoadingTodoId(tempId);
    setIsInputDisabled(true);

    try {
      const newTodo = await Methods.addTodo({
        title: trimmedTitle,
        completed: false,
        userId: USER_ID,
      });

      setTodos(currentTodos =>
        currentTodos.map(todo => (todo.id === tempId ? newTodo : todo)),
      );
      setNewTodoTitle('');
      updateCounter([...todos, tempTodoToAdd]);
    } catch {
      setError('Unable to add a todo');
      setTodos(currentTodos => currentTodos.filter(todo => todo.id !== tempId));
    } finally {
      setLoadingTodoId(null);
      setIsInputDisabled(false);
    }
  };

  function clearCompletedTodos() {
    const completedTodos = todos.filter(todo => todo.completed);

    const deletionPromises = completedTodos.map(todo =>
      Methods.deleteTodo(todo.id).catch(() => todo.id),
    );

    Promise.all(deletionPromises)
      .then(results => {
        const failedDeletions = results.filter(
          result => typeof result === 'number',
        );

        if (failedDeletions.length > 0) {
          setError('Unable to delete a todo');
        }

        setTodos(currentTodos =>
          currentTodos.filter(
            todo => !todo.completed || failedDeletions.includes(todo.id),
          ),
        );
        updateCounter(todos);
      })
      .catch(() => {
        setError('Unable to delete a todo');
      });
  }

  const filteredTodos = (() => {
    switch (statusFilter) {
      case 'Active':
        return todos.filter(todo => !todo.completed);
      case 'Completed':
        return todos.filter(todo => todo.completed);
      default:
        return todos;
    }
  })();

  const hideError = () => setError(null);

  if (!USER_ID) {
    return <UserWarning />;
  }

  return (
    <div className="todoapp">
      <h1 className="todoapp__title">todos</h1>

      <div className="todoapp__content">
        <header className="todoapp__header">
          <button
            type="button"
            className="todoapp__toggle-all active"
            data-cy="ToggleAllButton"
          />

          <form onSubmit={addTodo}>
            <input
              ref={newTodoInputRef}
              data-cy="NewTodoField"
              type="text"
              className="todoapp__new-todo"
              placeholder="What needs to be done?"
              value={newTodoTitle}
              onChange={e => setNewTodoTitle(e.target.value)}
              disabled={isInputDisabled}
            />
          </form>
        </header>

        <section className="todoapp__main" data-cy="TodoList">
          {filteredTodos.map(todo => (
            <div
              data-cy="Todo"
              className={`todo ${todo.completed ? 'completed' : ''}`}
              key={todo.id}
            >
              <label htmlFor="title" className="todo__status-label">
                {' '}
                <input
                  id="title"
                  data-cy="TodoStatus"
                  type="checkbox"
                  className="todo__status"
                  checked={todo.completed}
                />
              </label>

              <span data-cy="TodoTitle" className="todo__title">
                {todo.title}
              </span>

              <button
                type="button"
                className="todo__remove"
                data-cy="TodoDelete"
                onClick={() => deleteTodo(todo.id)}
              >
                ×
              </button>

              <div
                data-cy="TodoLoader"
                key={todo.id}
                className={`modal overlay ${loadingTodoId === todo.id ? 'is-active' : ''}`}
              >
                <div className="modal-background has-background-white-ter" />
                <div className="loader" />
              </div>
            </div>
          ))}
        </section>

        {todos.length > 0 && (
          <footer className="todoapp__footer" data-cy="Footer">
            <span className="todo-count" data-cy="TodosCounter">
              {counter} items left
            </span>

            <nav className="filter" data-cy="Filter">
              <a
                href="#/"
                className={`filter__link ${statusFilter === 'All' ? 'selected' : ''}`}
                data-cy="FilterLinkAll"
                onClick={() => setStatusFilter('All')}
              >
                All
              </a>

              <a
                href="#/active"
                className={`filter__link ${statusFilter === 'Active' ? 'selected' : ''}`}
                data-cy="FilterLinkActive"
                onClick={() => setStatusFilter('Active')}
              >
                Active
              </a>

              <a
                href="#/completed"
                className={`filter__link ${statusFilter === 'Completed' ? 'selected' : ''}`}
                data-cy="FilterLinkCompleted"
                onClick={() => setStatusFilter('Completed')}
              >
                Completed
              </a>
            </nav>

            <button
              type="button"
              className="todoapp__clear-completed"
              data-cy="ClearCompletedButton"
              disabled={
                filteredTodos.filter(todo => todo.completed).length === 0
              }
              onClick={clearCompletedTodos}
            >
              Clear completed
            </button>
          </footer>
        )}
      </div>

      <div
        data-cy="ErrorNotification"
        className={`notification is-danger is-light has-text-weight-normal ${error ? '' : 'hidden'}`}
      >
        <button
          data-cy="HideErrorButton"
          type="button"
          className="delete"
          onClick={hideError}
        />
        {error}
      </div>
    </div>
  );
};
