-- The "Tarix" (history) page was removed; earlier test notices pointed there. Point them to "Testlar".
UPDATE "notifications" SET "body" = replace("body", 'Tahlilni Tarix bo''limida ko''ring.', 'Tahlilni "Testlar" bo''limidagi oldingi natijalarda ko''ring.') WHERE "body" LIKE '%Tarix bo''limida%';
UPDATE "notifications" SET "body" = replace("body", 'Таҳлилни Тарих бўлимида кўринг.', 'Таҳлилни "Тестлар" бўлимидаги олдинги натижаларда кўринг.') WHERE "body" LIKE '%Тарих бўлимида%';
UPDATE "notifications" SET "body" = replace("body", 'Разбор — в разделе «История».', 'Разбор — в разделе «Тесты», в прошлых результатах.') WHERE "body" LIKE '%«История»%';
