import { Button } from 'antd';
import { Link } from 'react-router-dom';
import './NotFound.css';

export function NotFound() {
  return (
    <div className="not-found">
      <h1>404 – Страница не найдена</h1>
      <p>Извините, но запрошенная вами страница не существует.</p>
      <div className="not-found__actions">
        <Link to="/units">
          <Button type="primary">Вернуться к списку юнитов</Button>
        </Link>
      </div>
    </div>
  );
}
