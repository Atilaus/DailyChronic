#!/bin/bash

# Скрипт для копирования собранных файлов из dist в FullSite
# Использование: ./copy-dist.sh

echo "Копирование собранных файлов из dist в FullSite..."

# Создаем папку assets если её нет
mkdir -p FullSite/assets

# Копируем index.html
cp dist/index.html FullSite/
echo "✓ index.html скопирован"

# Копируем CSS и JS файлы
cp dist/assets/*.css FullSite/assets/
echo "✓ CSS файлы скопированы"

cp dist/assets/*.js FullSite/assets/
echo "✓ JS файлы скопированы"

# Копируем sitemap.xml и robots.txt (если есть)
if [ -f dist/sitemap.xml ]; then
    cp dist/sitemap.xml FullSite/
    echo "✓ sitemap.xml скопирован"
fi

if [ -f dist/robots.txt ]; then
    cp dist/robots.txt FullSite/
    echo "✓ robots.txt скопирован"
fi

echo ""
echo "Готово! Все файлы скопированы в папку FullSite"
echo ""
echo "Структура FullSite:"
ls -lh FullSite/
echo ""
echo "Структура FullSite/assets:"
ls -lh FullSite/assets/
